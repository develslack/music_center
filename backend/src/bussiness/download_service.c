#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <unistd.h>
#include <sys/stat.h>
#include <mysql/mysql.h>
#include "../system/routes.h"
#include "../system/db.h"
#include "download_service.h"

#define CHUNK_SIZE 65536 // 64 KB de buffer constante

static void get_download_value(const char *body, const char *key, char *out, size_t out_size) {
    char *pos = strstr(body, key);
    if (!pos) {
        out[0] = '\0';
        return;
    }
    pos += strlen(key);
    if (*pos == '=') pos++;
    const char *end = strchr(pos, '&');
    size_t len = end ? (size_t)(end - pos) : strlen(pos);
    if (len >= out_size) len = out_size - 1;
    strncpy(out, pos, len);
    out[len] = '\0';
}

static void sanitize_filename(const char *input, char *output, size_t max_len) {
    size_t j = 0;
    for (size_t i = 0; input[i] != '\0' && j < max_len - 1; i++) {
        char c = input[i];
        if (c == ' ' || c == '/' || c == '\\' || c == ':' || c == '*' || c == '?' || c == '"' || c == '<' || c == '>' || c == '|') {
            output[j++] = '_';
        } else {
            output[j++] = c;
        }
    }
    output[j] = '\0';
}

static void route_post_download_album(int client, const char *body) {
    char id_str[16] = {0};
    get_download_value(body, "id", id_str, sizeof(id_str));
    int id = atoi(id_str);

    if (id <= 0) {
        const char *bad = "HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\n\r\nID invalido";
        write(client, bad, strlen(bad));
        return;
    }

    char query[256];
    snprintf(query, sizeof(query), "SELECT album_year, album_name, album_path FROM mc_music WHERE id = %d LIMIT 1;", id);
    DBResult *res = db_query(query);
    MYSQL_ROW row;

    if (!res || !(row = mysql_fetch_row(res))) {
        if (res) db_free_result(res);
        const char *not_found = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n\r\nAlbum no encontrado";
        write(client, not_found, strlen(not_found));
        return;
    }

    char album_year[16] = {0};
    char album_name[128] = {0};
    char album_path[256] = {0};

    if (row[0]) strncpy(album_year, row[0], sizeof(album_year) - 1);
    if (row[1]) strncpy(album_name, row[1], sizeof(album_name) - 1);
    if (row[2]) strncpy(album_path, row[2], sizeof(album_path) - 1);
    db_free_result(res);

    // Resolver ruta física del álbum
    char dir_path[512];
    if (strncmp(album_path, "../music/", 9) == 0) {
        snprintf(dir_path, sizeof(dir_path), "%s", album_path);
    } else {
        const char *clean = strstr(album_path, "music/") ? strstr(album_path, "music/") + 6 : album_path;
        snprintf(dir_path, sizeof(dir_path), "../music/%s", clean);
    }

    struct stat st;
    if (stat(dir_path, &st) != 0 || !S_ISDIR(st.st_mode)) {
        snprintf(dir_path, sizeof(dir_path), "music/%s", album_path);
        if (stat(dir_path, &st) != 0 || !S_ISDIR(st.st_mode)) {
            const char *dir_err = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n\r\nDirectorio no encontrado";
            write(client, dir_err, strlen(dir_err));
            return;
        }
    }

    // Aseguramos existencia del directorio tmp
    system("mkdir -p ../tmp tmp");

    char safe_year[16];
    char safe_name[128];
    sanitize_filename(album_year, safe_year, sizeof(safe_year));
    sanitize_filename(album_name, safe_name, sizeof(safe_name));

    char zip_filename[256];
    snprintf(zip_filename, sizeof(zip_filename), "%s_%s.zip", safe_year, safe_name);

    // 1. Obtener la ruta ABSOLUTA de la carpeta tmp local para que el 'cd' no la rompa
    char abs_tmp_dir[512] = {0};
    if (realpath("../tmp", abs_tmp_dir) == NULL) {
        if (realpath("tmp", abs_tmp_dir) == NULL) {
            // Si ambas fallan, usamos /tmp del sistema que siempre es absoluto
            strncpy(abs_tmp_dir, "/tmp", sizeof(abs_tmp_dir) - 1);
        }
    }

    // 2. Ruta absoluta final del archivo ZIP
    char tmp_zip_path[1024];
    snprintf(tmp_zip_path, sizeof(tmp_zip_path), "%s/%s_%d.zip", abs_tmp_dir, safe_name, id);

    // 3. Ejecutar zip: ahora el destino es absoluto y no depende del 'cd'
    char cmd[2048];
    snprintf(cmd, sizeof(cmd), "cd \"%s\" && zip -r -q \"%s\" .", dir_path, tmp_zip_path);

    int cmd_res = system(cmd);
    if (cmd_res != 0) {
        printf("🚨 [DOWNLOAD] Error al ejecutar zip: %s\n", cmd);
        const char *zip_err = "HTTP/1.1 500 Internal Error\r\nContent-Type: text/plain\r\n\r\nError al comprimir album";
        write(client, zip_err, strlen(zip_err));
        return;
    }

    FILE *f = fopen(tmp_zip_path, "rb");
    if (!f) {
        unlink(tmp_zip_path);
        const char *open_err = "HTTP/1.1 500 Internal Error\r\nContent-Type: text/plain\r\n\r\nError al abrir ZIP generado";
        write(client, open_err, strlen(open_err));
        return;
    }

    fseek(f, 0, SEEK_END);
    long file_size = ftell(f);
    fseek(f, 0, SEEK_SET);

    // Cabecera HTTP completa con soporte CORS explícito
    char header[512];
    snprintf(header, sizeof(header),
             "HTTP/1.1 200 OK\r\n"
             "Access-Control-Allow-Origin: *\r\n"
             "Access-Control-Allow-Methods: POST, OPTIONS\r\n"
             "Access-Control-Expose-Headers: Content-Disposition, Content-Length\r\n"
             "Content-Type: application/zip\r\n"
             "Content-Disposition: attachment; filename=\"%s\"\r\n"
             "Content-Length: %ld\r\n"
             "Connection: close\r\n\r\n",
             zip_filename, file_size);

    write(client, header, strlen(header));

    // Streaming en bloques de 64 KB
    char *buffer = (char *)malloc(CHUNK_SIZE);
    if (buffer) {
        size_t bytes_read;
        while ((bytes_read = fread(buffer, 1, CHUNK_SIZE, f)) > 0) {
            write(client, buffer, bytes_read);
        }
        free(buffer);
    }

    fclose(f);
    unlink(tmp_zip_path);
    printf("✅ [DOWNLOAD] Álbum '%s' (%ld bytes) transmitido con éxito.\n", zip_filename, file_size);
}

void init_download_routes() {
    add_route("POST", "/download/album", route_post_download_album);
}
