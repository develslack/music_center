#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dirent.h>
#include <unistd.h>
#include <sys/stat.h>
#include <stdint.h>
#include <mysql/mysql.h>
#include "../system/routes.h"
#include "../system/db.h"
#include "player_service.h"

// Función auxiliar para extraer variables del body x-www-form-urlencoded
static void get_player_value(const char *body, const char *key, char *out, size_t out_size) {
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

// Codificador Base64 para audio
static const char b64_table[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
static char *base64_encode_audio(const unsigned char *data, size_t input_length, size_t *output_length) {
    *output_length = 4 * ((input_length + 2) / 3);
    char *encoded_data = (char *)malloc(*output_length + 1);
    if (!encoded_data) return NULL;

    for (size_t i = 0, j = 0; i < input_length;) {
        uint32_t octet_a = i < input_length ? data[i++] : 0;
        uint32_t octet_b = i < input_length ? data[i++] : 0;
        uint32_t octet_c = i < input_length ? data[i++] : 0;
        uint32_t triple = (octet_a << 16) + (octet_b << 8) + octet_c;

        encoded_data[j++] = b64_table[(triple >> 18) & 0x3F];
        encoded_data[j++] = b64_table[(triple >> 12) & 0x3F];
        encoded_data[j++] = (i > input_length + 1) ? '=' : b64_table[(triple >> 6) & 0x3F];
        encoded_data[j++] = (i > input_length) ? '=' : b64_table[triple & 0x3F];
    }
    encoded_data[*output_length] = '\0';
    return encoded_data;
}

// Función para obtener album_path de un ID
static int get_album_path_by_id(int id, char *out_path, size_t out_size) {
    char query[256];
    snprintf(query, sizeof(query), "SELECT album_path FROM mc_music WHERE id = %d LIMIT 1;", id);
    DBResult *res = db_query(query);
    MYSQL_ROW row;
    if (!res || !(row = mysql_fetch_row(res)) || !row[0]) {
        if (res) db_free_result(res);
        return 0;
    }
    strncpy(out_path, row[0], out_size - 1);
    out_path[out_size - 1] = '\0';
    db_free_result(res);
    return 1;
}

// Comparador para ordenar pistas alfabéticamente (01 - Pista, 02 - Pista...)
static int compare_strings(const void *a, const void *b) {
    return strcmp(*(const char **)a, *(const char **)b);
}

// ================================================================================================================= //
// HANDLER: Listar canciones .mp3 dentro del directorio del álbum
// ================================================================================================================= //
static void route_post_player_tracks(int client, const char *body) {
    char id_str[16] = {0};
    get_player_value(body, "id", id_str, sizeof(id_str));
    int id = atoi(id_str);

    if (id <= 0) {
        send_response(client, "400 Bad Request", "application/json", "{\"status\":\"error\",\"message\":\"ID invalido\"}");
        return;
    }

    char raw_path[256] = {0};
    if (!get_album_path_by_id(id, raw_path, sizeof(raw_path))) {
        send_response(client, "404 Not Found", "application/json", "{\"status\":\"error\",\"message\":\"Album no encontrado\"}");
        return;
    }

    // Normalizamos la ruta relativa al directorio de ejecución
    char dir_path[512];
    if (strncmp(raw_path, "../music/", 9) == 0) {
        snprintf(dir_path, sizeof(dir_path), "%s", raw_path);
    } else {
        const char *clean = strstr(raw_path, "music/") ? strstr(raw_path, "music/") + 6 : raw_path;
        snprintf(dir_path, sizeof(dir_path), "../music/%s", clean);
    }

    DIR *d = opendir(dir_path);
    if (!d) {
        // Fallback: probar desde la raíz de backend/
        snprintf(dir_path, sizeof(dir_path), "music/%s", raw_path);
        d = opendir(dir_path);
    }

    if (!d) {
        printf("🚨 [PLAYER] No se pudo abrir directorio: %s\n", dir_path);
        send_response(client, "404 Not Found", "application/json", "{\"status\":\"error\",\"message\":\"Directorio fisico no encontrado\"}");
        return;
    }

    struct dirent *dir;
    char *track_names[256];
    int track_count = 0;

    while ((dir = readdir(d)) != NULL) {
        if (dir->d_type == DT_REG || dir->d_type == DT_UNKNOWN) {
            const char *ext = strrchr(dir->d_name, '.');
            if (ext && (strcasecmp(ext, ".mp3") == 0)) {
                track_names[track_count] = strdup(dir->d_name);
                track_count++;
                if (track_count >= 256) break;
            }
        }
    }
    closedir(d);

    // Ordenar pistas por número/nombre
    qsort(track_names, track_count, sizeof(char *), compare_strings);

    // Armar JSON con el listado
    char *json = malloc((track_count * 256) + 512);
    strcpy(json, "{\"status\":\"ok\",\"tracks\":[");
    for (int i = 0; i < track_count; i++) {
        char item[300];
        snprintf(item, sizeof(item), "\"%s\"%s", track_names[i], (i < track_count - 1) ? "," : "");
        strcat(json, item);
        free(track_names[i]);
    }
    strcat(json, "]}");

    send_response(client, "200 OK", "application/json", json);
    free(json);
}

// ================================================================================================================= //
// HANDLER: Stream/Entrega de pista de audio en Base64
// ================================================================================================================= //
static void route_post_player_stream(int client, const char *body) {
    char id_str[16] = {0};
    char file_name[256] = {0};
    char d_file_name[256] = {0};

    get_player_value(body, "id", id_str, sizeof(id_str));
    get_player_value(body, "file", file_name, sizeof(file_name));
    url_decode(d_file_name, file_name);

    int id = atoi(id_str);
    if (id <= 0 || strlen(d_file_name) == 0) {
        send_response(client, "400 Bad Request", "application/json", "{\"status\":\"error\",\"message\":\"Parametros invalidos\"}");
        return;
    }

    char raw_path[256] = {0};
    if (!get_album_path_by_id(id, raw_path, sizeof(raw_path))) {
        send_response(client, "404 Not Found", "application/json", "{\"status\":\"error\",\"message\":\"Album no encontrado\"}");
        return;
    }

    // Ruta completa al archivo MP3
    char full_track_path[1024];
    snprintf(full_track_path, sizeof(full_track_path), "%s/%s", raw_path, d_file_name);

    FILE *f = fopen(full_track_path, "rb");
    if (!f) {
        // Fallback: probar bajo ../music/
        const char *clean = strstr(raw_path, "music/") ? strstr(raw_path, "music/") + 6 : raw_path;
        snprintf(full_track_path, sizeof(full_track_path), "../music/%s/%s", clean, d_file_name);
        f = fopen(full_track_path, "rb");
    }

    if (!f) {
        printf("🚨 [STREAM] No se pudo abrir pista: %s\n", full_track_path);
        send_response(client, "404 Not Found", "application/json", "{\"status\":\"error\",\"message\":\"Pista no encontrada en disco\"}");
        return;
    }

    fseek(f, 0, SEEK_END);
    long file_size = ftell(f);
    fseek(f, 0, SEEK_SET);

    unsigned char *audio_buf = malloc(file_size);
    if (!audio_buf) {
        fclose(f);
        send_response(client, "500 Internal Error", "application/json", "{\"status\":\"error\",\"message\":\"Memoria insuficiente para audio\"}");
        return;
    }

    fread(audio_buf, 1, file_size, f);
    fclose(f);

    size_t out_len = 0;
    char *b64_audio = base64_encode_audio(audio_buf, file_size, &out_len);
    free(audio_buf);

    if (!b64_audio) {
        send_response(client, "500 Internal Error", "application/json", "{\"status\":\"error\",\"message\":\"Error al codificar audio\"}");
        return;
    }

    size_t json_size = out_len + 256;
    char *json_res = malloc(json_size);
    snprintf(json_res, json_size, "{\"status\":\"ok\",\"audio\":\"data:audio/mp3;base64,%s\"}", b64_audio);

    send_response(client, "200 OK", "application/json", json_res);
    free(b64_audio);
    free(json_res);
}

// ================================================================================================================= //
// REGISTRO DE RUTAS DEL REPRODUCTOR
// ================================================================================================================= //
void init_player_routes() {
    add_route("POST", "/player/tracks", route_post_player_tracks);
    add_route("POST", "/player/stream", route_post_player_stream);
}
