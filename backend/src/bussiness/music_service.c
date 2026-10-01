#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <openssl/sha.h>
#include <mysql/mysql.h>
#include <unistd.h>
#include <sys/stat.h>
#include "../system/hash.h"
#include "../system/routes.h"
#include "../system/db.h"
#include "../system/ArrayList.h"
#include "music_service.h"

// Variable estática para la memoria local del módulo
static ArrayList* pListMusicLocal = NULL;

// CONSTRUCTOR
// ===================================================================================================================================== //
Music* newMusic(){
    Music* oneMusic = (Music*)malloc(sizeof(Music));
    if(oneMusic != NULL){
        memset(oneMusic, 0, sizeof(Music));
    }
    return oneMusic;
}

// ===================================================================================================================================== //
// Inicialización de caché
// ===================================================================================================================================== //
void music_init_cache(ArrayList* alistMusic) {
    if(alistMusic != NULL) {
        pListMusicLocal = alistMusic;
        printf("===================================================================================\n");
        printf("✅ Negociando espacio en memoria para el servicio de [ Albunes ].\n");
    } else {
        printf("===================================================================================\n");
        printf("⚠️ Advertencia: Se intentó inicializar la caché de [ Albunes ] con NULL.\n");
    }
}

// ===================================================================================================================================== //
// Cargar datos en ArrayList
// ===================================================================================================================================== //
void music_load_storage(ArrayList* alistMusic) {
    if(alistMusic == NULL) return;

    DBResult *res = db_query("SELECT * FROM mc_music");
    if (!res) return;

    MYSQL_ROW row;
    while ((row = mysql_fetch_row(res))) {
        Music* nMusic = newMusic();
        if (nMusic != NULL) {
            nMusic->id = row[0] ? atoi(row[0]) : 0;
            if (row[1]) strncpy(nMusic->album_year,   row[1], sizeof(nMusic->album_year) - 1);
            if (row[2]) strncpy(nMusic->album_name,   row[2], sizeof(nMusic->album_name) - 1);
            if (row[3]) strncpy(nMusic->album_artist, row[3], sizeof(nMusic->album_artist) - 1);
            if (row[4]) strncpy(nMusic->album_genre,  row[4], sizeof(nMusic->album_genre) - 1);
            if (row[5]) strncpy(nMusic->album_art,    row[5], sizeof(nMusic->album_art) - 1);
            if (row[6]) strncpy(nMusic->album_bio,    row[6], sizeof(nMusic->album_bio) - 1);
            if (row[7]) strncpy(nMusic->album_path,   row[7], sizeof(nMusic->album_path) - 1);
            nMusic->album_chart = row[8] ? atoi(row[8]) : 0;
            alistMusic->add(alistMusic, nMusic);
        }
    }

    db_free_result(res);
    printf("===================================================================================\n");
    printf("📊 Memoria: %d Albunes cargados. Espacio reservado: %d slots.\n", alistMusic->len(alistMusic), alistMusic->reservedSize);
}

// ===================================================================================================================================== //
// Funciones auxiliares para lectura de variables
// ===================================================================================================================================== //
static void get_music_value(const char *body, const char *key, char *out, size_t out_size) {
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

// ===================================================================================================================================== //
// Codificador y Decodificador Base64
// ===================================================================================================================================== //
static const char b64_table[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static char *base64_encode(const unsigned char *data, size_t input_length, size_t *output_length) {
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

static unsigned char *base64_decode(const char *data, size_t input_length, size_t *output_length) {
    if (input_length % 4 != 0) return NULL;

    *output_length = (input_length / 4) * 3;
    if (data[input_length - 1] == '=') (*output_length)--;
    if (data[input_length - 2] == '=') (*output_length)--;

    unsigned char *decoded_data = (unsigned char *)malloc(*output_length);
    if (!decoded_data) return NULL;

    static char decoding_table[256];
    static int table_built = 0;
    if (!table_built) {
        memset(decoding_table, 0x80, 256);
        for (int i = 0; i < 64; i++) decoding_table[(unsigned char)b64_table[i]] = (char)i;
        decoding_table['='] = 0;
        table_built = 1;
    }

    for (size_t i = 0, j = 0; i < input_length;) {
        uint32_t a = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];
        uint32_t b = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];
        uint32_t c = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];
        uint32_t d = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];

        uint32_t triple = (a << 18) + (b << 12) + (c << 6) + d;

        if (j < *output_length) decoded_data[j++] = (triple >> 16) & 0xFF;
        if (j < *output_length) decoded_data[j++] = (triple >> 8) & 0xFF;
        if (j < *output_length) decoded_data[j++] = triple & 0xFF;
    }
    return decoded_data;
}

// Función auxiliar para determinar la ruta física adecuada para escribir en backend/art/
static void get_target_art_disk_path(const char *filename, char *out_disk_path, size_t max_len) {
    // Si existe '../art' (ejecución habitual desde bin/), guardamos allí
    struct stat st;
    if (stat("../art", &st) == 0 && S_ISDIR(st.st_mode)) {
        snprintf(out_disk_path, max_len, "../art/%s", filename);
    } else if (stat("art", &st) == 0 && S_ISDIR(st.st_mode)) {
        snprintf(out_disk_path, max_len, "art/%s", filename);
    } else if (stat("backend/art", &st) == 0 && S_ISDIR(st.st_mode)) {
        snprintf(out_disk_path, max_len, "backend/art/%s", filename);
    } else {
        // Si no existe, creamos en ../art
        system("mkdir -p ../art art");
        snprintf(out_disk_path, max_len, "../art/%s", filename);
    }
}

// Guardar archivo binario de imagen desde Base64 recibido
static int save_art_file(const char *filename, const char *b64_content) {
    if (!filename || strlen(filename) == 0 || !b64_content || strlen(b64_content) == 0) {
        return 0;
    }

    // Saltar prefijo Data URL si viene incluido (ej: data:image/jpeg;base64,...)
    const char *payload = strstr(b64_content, "base64,");
    if (payload) {
        payload += 7;
    } else {
        payload = b64_content;
    }

    size_t out_len = 0;
    unsigned char *decoded = base64_decode(payload, strlen(payload), &out_len);
    if (!decoded) return 0;

    char target_path[512];
    get_target_art_disk_path(filename, target_path, sizeof(target_path));

    FILE *f = fopen(target_path, "wb");
    if (!f) {
        free(decoded);
        printf("🚨 [ART] No se pudo abrir para escritura: %s\n", target_path);
        return 0;
    }

    fwrite(decoded, 1, out_len, f);
    fclose(f);
    free(decoded);

    printf("🖼️ [ART] Portada guardada físicamente en: %s (%zu bytes)\n", target_path, out_len);
    return 1;
}

// ===================================================================================================================================== //
// STORED PROCEDURES: Prepared Statements
// ===================================================================================================================================== //
static int sp_insertar_music(const char* album_year, const char* album_name, const char* album_artist, const char* album_genre, const char* album_art, const char* album_bio, const char* album_path) {
    MYSQL_STMT *stmt;
    MYSQL_BIND bind_param[7];
    MYSQL_BIND bind_result[1];
    int nuevo_id = 0;
    const char *query = "CALL sp_insertar_music(?, ?, ?, ?, ?, ?, ?)";

    MYSQL *conn = connect_db();
    if (!conn) return 0;

    stmt = mysql_stmt_init(conn);
    if (!stmt || mysql_stmt_prepare(stmt, query, strlen(query))) {
        if (stmt) mysql_stmt_close(stmt);
        mysql_close(conn);
        return 0;
    }

    memset(bind_param, 0, sizeof(bind_param));
    bind_param[0].buffer_type = MYSQL_TYPE_STRING;
    bind_param[0].buffer = (char *)album_year;
    bind_param[0].buffer_length = strlen(album_year);

    bind_param[1].buffer_type = MYSQL_TYPE_STRING;
    bind_param[1].buffer = (char *)album_name;
    bind_param[1].buffer_length = strlen(album_name);

    bind_param[2].buffer_type = MYSQL_TYPE_STRING;
    bind_param[2].buffer = (char *)album_artist;
    bind_param[2].buffer_length = strlen(album_artist);

    bind_param[3].buffer_type = MYSQL_TYPE_STRING;
    bind_param[3].buffer = (char *)album_genre;
    bind_param[3].buffer_length = strlen(album_genre);

    bind_param[4].buffer_type = MYSQL_TYPE_STRING;
    bind_param[4].buffer = (char *)album_art;
    bind_param[4].buffer_length = strlen(album_art);

    bind_param[5].buffer_type = MYSQL_TYPE_STRING;
    bind_param[5].buffer = (char *)album_bio;
    bind_param[5].buffer_length = strlen(album_bio);

    bind_param[6].buffer_type = MYSQL_TYPE_STRING;
    bind_param[6].buffer = (char *)album_path;
    bind_param[6].buffer_length = strlen(album_path);

    if (mysql_stmt_bind_param(stmt, bind_param) || mysql_stmt_execute(stmt)) {
        mysql_stmt_close(stmt);
        mysql_close(conn);
        return 0;
    }

    memset(bind_result, 0, sizeof(bind_result));
    bind_result[0].buffer_type = MYSQL_TYPE_LONG;
    bind_result[0].buffer = &nuevo_id;

    if (mysql_stmt_bind_result(stmt, bind_result)) {
        mysql_stmt_close(stmt);
        mysql_close(conn);
        return 0;
    }

    mysql_stmt_fetch(stmt);
    mysql_stmt_free_result(stmt);
    while (!mysql_stmt_next_result(stmt)) mysql_stmt_free_result(stmt);

    mysql_stmt_close(stmt);
    mysql_close(conn);
    return nuevo_id;
}

static int sp_editar_music(int id, const char* album_year, const char* album_name, const char* album_artist, const char* album_genre, const char* album_art, const char* album_bio, const char* album_path){
    MYSQL_STMT *stmt;
    MYSQL_BIND bind_param[8];
    const char *query = "CALL sp_editar_music(?, ?, ?, ?, ?, ?, ?, ?)";

    MYSQL *conn = connect_db();
    if (!conn) return 0;

    stmt = mysql_stmt_init(conn);
    if (!stmt || mysql_stmt_prepare(stmt, query, strlen(query))) {
        if (stmt) mysql_stmt_close(stmt);
        mysql_close(conn);
        return 0;
    }

    memset(bind_param, 0, sizeof(bind_param));
    bind_param[0].buffer_type = MYSQL_TYPE_LONG;
    bind_param[0].buffer = (void *)&id;
    bind_param[0].is_unsigned = 0;

    bind_param[1].buffer_type = MYSQL_TYPE_STRING;
    bind_param[1].buffer = (char *)album_year;
    bind_param[1].buffer_length = strlen(album_year);

    bind_param[2].buffer_type = MYSQL_TYPE_STRING;
    bind_param[2].buffer = (char *)album_name;
    bind_param[2].buffer_length = strlen(album_name);

    bind_param[3].buffer_type = MYSQL_TYPE_STRING;
    bind_param[3].buffer = (char *)album_artist;
    bind_param[3].buffer_length = strlen(album_artist);

    bind_param[4].buffer_type = MYSQL_TYPE_STRING;
    bind_param[4].buffer = (char *)album_genre;
    bind_param[4].buffer_length = strlen(album_genre);

    bind_param[5].buffer_type = MYSQL_TYPE_STRING;
    bind_param[5].buffer = (char *)album_art;
    bind_param[5].buffer_length = strlen(album_art);

    bind_param[6].buffer_type = MYSQL_TYPE_STRING;
    bind_param[6].buffer = (char *)album_bio;
    bind_param[6].buffer_length = strlen(album_bio);

    bind_param[7].buffer_type = MYSQL_TYPE_STRING;
    bind_param[7].buffer = (char *)album_path;
    bind_param[7].buffer_length = strlen(album_path);

    if (mysql_stmt_bind_param(stmt, bind_param) || mysql_stmt_execute(stmt)) {
        mysql_stmt_close(stmt);
        mysql_close(conn);
        return 0;
    }

    while (!mysql_stmt_next_result(stmt)) mysql_stmt_free_result(stmt);
    mysql_stmt_close(stmt);
    mysql_close(conn);
    return 1;
}

// ===================================================================================================================================== //
// FUNCIÓN PARA NUEVO REGISTRO
// ===================================================================================================================================== //
int music_service_register(const char *body, char *error_msg, int error_size) {
    char album_year[16], d_album_year[16];
    char album_name[256], d_album_name[256];
    char album_artist[256], d_album_artist[256];
    char album_genre[128], d_album_genre[128];
    char album_bio[4096], d_album_bio[4096];
    char album_path[256], d_album_path[256];

    char art_filename[256], d_art_filename[256];
    char *art_b64 = NULL;
    char db_album_art[256] = "";

    get_music_value(body, "album_year", album_year, sizeof(album_year));
    url_decode(d_album_year, album_year);

    get_music_value(body, "album_name", album_name, sizeof(album_name));
    url_decode(d_album_name, album_name);

    get_music_value(body, "album_artist", album_artist, sizeof(album_artist));
    url_decode(d_album_artist, album_artist);

    get_music_value(body, "album_genre", album_genre, sizeof(album_genre));
    url_decode(d_album_genre, album_genre);

    get_music_value(body, "album_bio", album_bio, sizeof(album_bio));
    url_decode(d_album_bio, album_bio);

    get_music_value(body, "album_path", album_path, sizeof(album_path));
    url_decode(d_album_path, album_path);

    // Parámetros de la portada
    get_music_value(body, "art_filename", art_filename, sizeof(art_filename));
    url_decode(d_art_filename, art_filename);

    if (strlen(d_album_year) == 0 || strlen(d_album_name) == 0 || strlen(d_album_artist) == 0 ||
        strlen(d_album_genre) == 0 || strlen(d_album_path) == 0) {
        snprintf(error_msg, error_size, "Hay campos obligatorios sin completar.");
        return 0;
    }

    if (pListMusicLocal != NULL) {
        for (int i = 0; i < pListMusicLocal->len(pListMusicLocal); i++) {
            Music* nMusic = (Music*) pListMusicLocal->get(pListMusicLocal, i);
            if (strcasecmp(nMusic->album_name, d_album_name) == 0) {
                snprintf(error_msg, error_size, "Error: Album '%s' existente.", d_album_name);
                return 0;
            }
        }
    }

    // Si viene archivo de portada en Base64, lo guardamos físicamente
    char *pos_art = strstr(body, "art_data=");
    if (pos_art && strlen(d_art_filename) > 0) {
        pos_art += 9;
        const char *end_art = strchr(pos_art, '&');
        size_t b64_len = end_art ? (size_t)(end_art - pos_art) : strlen(pos_art);

        art_b64 = (char *)malloc(b64_len + 1);
        if (art_b64) {
            strncpy(art_b64, pos_art, b64_len);
            art_b64[b64_len] = '\0';

            char *d_art_b64 = (char *)malloc(b64_len + 1);
            if (d_art_b64) {
                url_decode(d_art_b64, art_b64);
                if (save_art_file(d_art_filename, d_art_b64)) {
                    snprintf(db_album_art, sizeof(db_album_art), "../art/%s", d_art_filename);
                }
                free(d_art_b64);
            }
            free(art_b64);
        }
    }

    int nuevo_id = sp_insertar_music(d_album_year, d_album_name, d_album_artist, d_album_genre, db_album_art, d_album_bio, d_album_path);
    if (nuevo_id <= 0) {
        snprintf(error_msg, error_size, "Error interno al guardar en la base de datos.");
        return 0;
    }

    Music* nuevoMusic = newMusic();
    if (nuevoMusic) {
        memset(nuevoMusic, 0, sizeof(Music));
        nuevoMusic->id = nuevo_id;
        strncpy(nuevoMusic->album_year, d_album_year, sizeof(nuevoMusic->album_year) - 1);
        strncpy(nuevoMusic->album_name, d_album_name, sizeof(nuevoMusic->album_name) - 1);
        strncpy(nuevoMusic->album_artist, d_album_artist, sizeof(nuevoMusic->album_artist) - 1);
        strncpy(nuevoMusic->album_genre, d_album_genre, sizeof(nuevoMusic->album_genre) - 1);
        strncpy(nuevoMusic->album_art, db_album_art, sizeof(nuevoMusic->album_art) - 1);
        strncpy(nuevoMusic->album_bio, d_album_bio, sizeof(nuevoMusic->album_bio) - 1);
        strncpy(nuevoMusic->album_path, d_album_path, sizeof(nuevoMusic->album_path) - 1);

        pListMusicLocal->add(pListMusicLocal, nuevoMusic);
        printf("✅ Sincronización exitosa: Album '%s' (ID: %d) añadido a RAM con portada '%s'.\n",
                d_album_name, nuevo_id, db_album_art);
    }

    return 1;
}

// ===================================================================================================================================== //
// FUNCIÓN EDICIÓN DE ÁLBUM
// ===================================================================================================================================== //
int music_service_edit(const char *body, char *error_msg, int error_size) {
    char id_str[32];
    char album_year[16], d_album_year[16];
    char album_name[256], d_album_name[256];
    char album_artist[256], d_album_artist[256];
    char album_genre[128], d_album_genre[128];
    char album_bio[4096], d_album_bio[4096];
    char album_path[256], d_album_path[256];

    char art_filename[256], d_art_filename[256];
    char db_album_art[256] = "";

    get_music_value(body, "id", id_str, sizeof(id_str));
    int id_a_editar = atoi(id_str);

    get_music_value(body, "album_year", album_year, sizeof(album_year));
    url_decode(d_album_year, album_year);

    get_music_value(body, "album_name", album_name, sizeof(album_name));
    url_decode(d_album_name, album_name);

    get_music_value(body, "album_artist", album_artist, sizeof(album_artist));
    url_decode(d_album_artist, album_artist);

    get_music_value(body, "album_genre", album_genre, sizeof(album_genre));
    url_decode(d_album_genre, album_genre);

    get_music_value(body, "album_bio", album_bio, sizeof(album_bio));
    url_decode(d_album_bio, album_bio);

    get_music_value(body, "album_path", album_path, sizeof(album_path));
    url_decode(d_album_path, album_path);

    get_music_value(body, "art_filename", art_filename, sizeof(art_filename));
    url_decode(d_art_filename, art_filename);

    if (id_a_editar <= 0 || strlen(d_album_year) == 0 || strlen(d_album_name) == 0 ||
        strlen(d_album_artist) == 0 || strlen(d_album_genre) == 0 || strlen(d_album_path) == 0) {
        snprintf(error_msg, error_size, "ID ó Campos obligatorios incompletos.");
        return 0;
    }

    // Recuperar la portada existente por si no se modifica en esta edición
    if (pListMusicLocal != NULL) {
        for (int i = 0; i < pListMusicLocal->len(pListMusicLocal); i++) {
            Music* nMusic = (Music*) pListMusicLocal->get(pListMusicLocal, i);
            if (nMusic->id == id_a_editar) {
                strncpy(db_album_art, nMusic->album_art, sizeof(db_album_art) - 1);
            }
            if (nMusic->id != id_a_editar && strcasecmp(nMusic->album_name, d_album_name) == 0) {
                snprintf(error_msg, error_size, "Error: Album Existente.");
                return 0;
            }
        }
    }

    // Si el usuario seleccionó una imagen nueva, se guarda físicamente y se actualiza la ruta
    char *pos_art = strstr(body, "art_data=");
    if (pos_art && strlen(d_art_filename) > 0) {
        pos_art += 9;
        const char *end_art = strchr(pos_art, '&');
        size_t b64_len = end_art ? (size_t)(end_art - pos_art) : strlen(pos_art);

        char *art_b64 = (char *)malloc(b64_len + 1);
        if (art_b64) {
            strncpy(art_b64, pos_art, b64_len);
            art_b64[b64_len] = '\0';

            char *d_art_b64 = (char *)malloc(b64_len + 1);
            if (d_art_b64) {
                url_decode(d_art_b64, art_b64);
                if (save_art_file(d_art_filename, d_art_b64)) {
                    snprintf(db_album_art, sizeof(db_album_art), "../art/%s", d_art_filename);
                }
                free(d_art_b64);
            }
            free(art_b64);
        }
    }

    if (sp_editar_music(id_a_editar, d_album_year, d_album_name, d_album_artist, d_album_genre, db_album_art, d_album_bio, d_album_path) == 0) {
        snprintf(error_msg, error_size, "Error al actualizar en la base de datos.");
        return 0;
    }

    if (pListMusicLocal != NULL) {
        for (int i = 0; i < pListMusicLocal->len(pListMusicLocal); i++) {
            Music* nMusic = (Music*) pListMusicLocal->get(pListMusicLocal, i);
            if (nMusic->id == id_a_editar) {
                strncpy(nMusic->album_year, d_album_year, sizeof(nMusic->album_year) - 1);
                strncpy(nMusic->album_name, d_album_name, sizeof(nMusic->album_name) - 1);
                strncpy(nMusic->album_artist, d_album_artist, sizeof(nMusic->album_artist) - 1);
                strncpy(nMusic->album_genre, d_album_genre, sizeof(nMusic->album_genre) - 1);
                strncpy(nMusic->album_art, db_album_art, sizeof(nMusic->album_art) - 1);
                strncpy(nMusic->album_bio, d_album_bio, sizeof(nMusic->album_bio) - 1);
                strncpy(nMusic->album_path, d_album_path, sizeof(nMusic->album_path) - 1);
                printf("✅ Memoria sincronizada: Album ID %d actualizado ('%s', art: '%s').\n",
                        id_a_editar, d_album_name, db_album_art);
                break;
            }
        }
    }

    return 1;
}

// ===================================================================================================================================== //
// LÓGICA QUE RETORNA UN REGISTRO AL SER CONSULTADO POR ID
// ===================================================================================================================================== //
int get_music_service_id(const char *body, char *json_out, int out_size) {
    char id_str[10];
    get_music_value(body, "id", id_str, sizeof(id_str));

    if (strlen(id_str) == 0) {
        snprintf(json_out, out_size, "{ \"status\": \"error\", \"message\": \"ID no provisto\" }");
        return 0;
    }

    char query[512];
    snprintf(query, sizeof(query), "SELECT * FROM mc_music WHERE id = %s LIMIT 1;", id_str);

    DBResult *res = db_query(query);
    MYSQL_ROW row;

    if (!res || !(row = mysql_fetch_row(res))) {
        snprintf(json_out, out_size, "{ \"status\": \"error\", \"message\": \"Album no encontrado\" }");
        if (res) db_free_result(res);
        return 0;
    }

    snprintf(json_out, out_size,
             "{ \"id\": %s, \"album_year\": \"%s\", \"album_name\": \"%s\", \"album_artist\": \"%s\", \"album_genre\": \"%s\", \"album_art\": \"%s\", \"album_bio\": \"%s\", \"album_path\": \"%s\" }",
             row[0] ? row[0] : "0",
             row[1] ? row[1] : "",
             row[2] ? row[2] : "",
             row[3] ? row[3] : "",
             row[4] ? row[4] : "",
             row[5] ? row[5] : "",
             row[6] ? row[6] : "",
             row[7] ? row[7] : "");

    db_free_result(res);
    return 1;
}

// ===================================================================================================================================== //
// ROUTES HANDLERS
// ===================================================================================================================================== //
static void route_post_music(int client, const char *body) {
    char error_msg[256];
    if (music_service_register(body, error_msg, sizeof(error_msg))) {
        send_response(client, "200 OK", "application/json", "{ \"status\": \"ok\", \"message\": \"Album creado y caché actualizada\" }");
    } else {
        char response[512];
        snprintf(response, sizeof(response), "{ \"status\": \"error\", \"message\": \"%s\" }", error_msg);
        send_response(client, "400 Bad Request", "application/json", response);
    }
}

static void route_post_music_edit(int client, const char *body) {
    char error_msg[256];
    if (music_service_edit(body, error_msg, sizeof(error_msg))) {
        send_response(client, "200 OK", "application/json", "{ \"status\": \"ok\", \"message\": \"Album actualizado correctamente\" }");
    } else {
        char response[512];
        snprintf(response, sizeof(response), "{ \"status\": \"error\", \"message\": \"%s\" }", error_msg);
        send_response(client, "400 Bad Request", "application/json", response);
    }
}

static void route_get_music_list(int client, const char *body) {
    if (pListMusicLocal == NULL) {
        printf("❌ Error crítico: pListMusicLocal sigue siendo NULL en el handler.\n");
        send_response(client, "500 Internal Error", "application/json", "{\"error\":\"Error de vinculación de memoria\"}");
        return;
    }

    size_t total_registros = pListMusicLocal->len(pListMusicLocal);
    size_t buffer_size = (total_registros * 650) + 512;
    char *json = (char*) calloc(1, buffer_size);

    if (json == NULL) {
        send_response(client, "500 Internal Server Error", "text/plain", "Error de memoria");
        return;
    }

    strcpy(json, "[");
    for (int i = 0; i < total_registros; i++) {
        Music* oneMusic = (Music*) pListMusicLocal->get(pListMusicLocal, i);
        char item[600];

        snprintf(item, sizeof(item),
            "{\"id\": %d, \"album_year\": \"%s\", \"album_name\": \"%s\", \"album_artist\": \"%s\", \"album_genre\": \"%s\", \"album_art\": \"%s\", \"album_bio\": \"%s\", \"album_path\": \"%s\" }%s",
            oneMusic->id, oneMusic->album_year, oneMusic->album_name, oneMusic->album_artist, oneMusic->album_genre, oneMusic->album_art, oneMusic->album_bio, oneMusic->album_path, (i < total_registros - 1) ? "," : "");

        strcat(json, item);
    }
    strcat(json, "]");

    send_response(client, "200 OK", "application/json", json);
    free(json);
}

static void route_get_music_by_id(int client, const char *body) {
    char response_json[1024];
    if (get_music_service_id(body, response_json, sizeof(response_json))) {
        send_response(client, "200 OK", "application/json", response_json);
    } else {
        send_response(client, "404 Not Found", "application/json", response_json);
    }
}

// ===================================================================================================================================== //
// ROUTE POST: Obtener portada del álbum en Base64
// ===================================================================================================================================== //
static void route_post_music_art(int client, const char *body) {
    char id_str[16] = {0};
    get_music_value(body, "id", id_str, sizeof(id_str));

    int album_id = atoi(id_str);
    if (album_id <= 0 || pListMusicLocal == NULL) {
        send_response(client, "400 Bad Request", "application/json", "{\"status\":\"error\",\"message\":\"ID invalido\"}");
        return;
    }

    char raw_art_path[256] = {0};
    for (int i = 0; i < pListMusicLocal->len(pListMusicLocal); i++) {
        Music *m = (Music *)pListMusicLocal->get(pListMusicLocal, i);
        if (m->id == album_id) {
            strncpy(raw_art_path, m->album_art, sizeof(raw_art_path) - 1);
            break;
        }
    }

    if (strlen(raw_art_path) == 0) {
        send_response(client, "404 Not Found", "application/json", "{\"status\":\"error\",\"message\":\"Registro sin imagen\"}");
        return;
    }

    const char *clean_name = raw_art_path;
    const char *pos = strstr(raw_art_path, "art/");
    if (pos) {
        clean_name = pos + 4;
    }

    char file_disk_path[512];
    FILE *f = NULL;

    snprintf(file_disk_path, sizeof(file_disk_path), "../art/%s", clean_name);
    f = fopen(file_disk_path, "rb");

    if (!f) {
        snprintf(file_disk_path, sizeof(file_disk_path), "art/%s", clean_name);
        f = fopen(file_disk_path, "rb");
    }

    if (!f) {
        snprintf(file_disk_path, sizeof(file_disk_path), "backend/art/%s", clean_name);
        f = fopen(file_disk_path, "rb");
    }

    if (!f) {
        printf("🚨 [ART] No se encontro '%s' en ninguna ruta de disco.\n", clean_name);
        send_response(client, "404 Not Found", "application/json", "{\"status\":\"error\",\"message\":\"Archivo no encontrado en disco\"}");
        return;
    }

    fseek(f, 0, SEEK_END);
    long file_size = ftell(f);
    fseek(f, 0, SEEK_SET);

    unsigned char *file_buffer = (unsigned char *)malloc(file_size);
    if (!file_buffer) {
        fclose(f);
        send_response(client, "500 Internal Error", "application/json", "{\"status\":\"error\",\"message\":\"Error de memoria RAM\"}");
        return;
    }

    fread(file_buffer, 1, file_size, f);
    fclose(f);

    size_t out_len = 0;
    char *b64_data = base64_encode(file_buffer, file_size, &out_len);
    free(file_buffer);

    if (!b64_data) {
        send_response(client, "500 Internal Error", "application/json", "{\"status\":\"error\",\"message\":\"Error al codificar imagen\"}");
        return;
    }

    const char *mime = "image/jpeg";
    if (strstr(clean_name, ".png") || strstr(clean_name, ".PNG")) {
        mime = "image/png";
    }

    size_t json_size = out_len + 256;
    char *json_res = (char *)malloc(json_size);
    snprintf(json_res, json_size, "{\"status\":\"ok\",\"mime\":\"%s\",\"data\":\"data:%s;base64,%s\"}", mime, mime, b64_data);

    send_response(client, "200 OK", "application/json", json_res);

    free(b64_data);
    free(json_res);
}

// ===================================================================================================================================== //
// INIT ALL ROUTES ALBUNES
// ===================================================================================================================================== //
void init_music_routes() {
    add_route("GET",  "/music/list", route_get_music_list);
    add_route("POST", "/music/add",  route_post_music);
    add_route("POST", "/music/edit", route_post_music_edit);
    add_route("POST", "/music/get",  route_get_music_by_id);
    add_route("POST", "/music/art",  route_post_music_art);
}
