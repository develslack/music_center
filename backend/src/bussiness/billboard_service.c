#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <mysql/mysql.h>
#include "../system/routes.h"
#include "../system/db.h"
#include "billboard_service.h"

// Función auxiliar para leer parámetros del body
static void get_billboard_value(const char *body, const char *key, char *out, size_t out_size) {
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

// ================================================================================================================= //
// HANDLER: Incrementar contador al presionar reproducir
// ================================================================================================================= //
static void route_post_billboard_hit(int client, const char *body) {
    char id_str[16] = {0};
    get_billboard_value(body, "id", id_str, sizeof(id_str));
    int id = atoi(id_str);

    if (id <= 0) {
        send_response(client, "400 Bad Request", "application/json", "{\"status\":\"error\",\"message\":\"ID invalido\"}");
        return;
    }

    char query[256];
    snprintf(query, sizeof(query), "UPDATE mc_music SET album_chart = album_chart + 1 WHERE id = %d;", id);

    MYSQL *conn = connect_db();
    if (conn) {
        mysql_query(conn, query);
        mysql_close(conn);
    }

    send_response(client, "200 OK", "application/json", "{\"status\":\"ok\"}");
}

// ================================================================================================================= //
// HANDLER: Obtener el Top Charts de Álbumes Más Escuchados
// ================================================================================================================= //
static void route_get_billboard_top(int client, const char *body) {
    char query[512] = "SELECT id, album_year, album_name, album_artist, album_genre, album_chart, album_art, album_bio, album_path "
                      "FROM mc_music WHERE album_chart > 0 "
                      "ORDER BY album_chart DESC LIMIT 10;";

    DBResult *res = db_query(query);
    if (!res) {
        send_response(client, "200 OK", "application/json", "[]");
        return;
    }

    char *json = (char *)malloc(8192);
    strcpy(json, "[");

    MYSQL_ROW row;
    int first = 1;
    while ((row = mysql_fetch_row(res))) {
        char item[1024];
        // Escapamos comillas simples o dobles básicas en bio si existieran
        snprintf(item, sizeof(item),
                 "%s{\"id\":%s,\"year\":\"%s\",\"name\":\"%s\",\"artist\":\"%s\",\"genre\":\"%s\",\"chart\":%s,\"art\":\"%s\",\"path\":\"%s\"}",
                 first ? "" : ",",
                 row[0] ? row[0] : "0",
                 row[1] ? row[1] : "",
                 row[2] ? row[2] : "",
                 row[3] ? row[3] : "",
                 row[4] ? row[4] : "",
                 row[5] ? row[5] : "0",
                 row[6] ? row[6] : "",
                 row[8] ? row[8] : "");
        strcat(json, item);
        first = 0;
    }
    strcat(json, "]");
    db_free_result(res);

    send_response(client, "200 OK", "application/json", json);
    free(json);
}

// ================================================================================================================= //
// HANDLER: Consejero Musical (Recomendaciones del mismo género / estilo)
// ================================================================================================================= //
static void route_post_billboard_recommend(int client, const char *body) {
    char id_str[16] = {0};
    get_billboard_value(body, "id", id_str, sizeof(id_str));
    int id = atoi(id_str);

    if (id <= 0) {
        send_response(client, "400 Bad Request", "application/json", "{\"status\":\"error\",\"message\":\"ID invalido\"}");
        return;
    }

    // 1. Obtener el género del álbum actual
    char query_genre[256];
    snprintf(query_genre, sizeof(query_genre), "SELECT album_genre FROM mc_music WHERE id = %d LIMIT 1;", id);
    DBResult *res_g = db_query(query_genre);
    MYSQL_ROW row_g;

    if (!res_g || !(row_g = mysql_fetch_row(res_g)) || !row_g[0]) {
        if (res_g) db_free_result(res_g);
        send_response(client, "404 Not Found", "application/json", "{\"status\":\"error\",\"message\":\"Album no encontrado\"}");
        return;
    }

    char current_genre[128];
    strncpy(current_genre, row_g[0], sizeof(current_genre) - 1);
    current_genre[sizeof(current_genre) - 1] = '\0';
    db_free_result(res_g);

    // 2. Buscar hasta 4 recomendaciones del mismo género que no sean el mismo disco, priorizando las más escuchadas
    char query_rec[512];
    snprintf(query_rec, sizeof(query_rec),
             "SELECT id, album_year, album_name, album_artist, album_genre, album_chart, album_art, album_bio, album_path "
             "FROM mc_music WHERE album_genre = '%s' AND id != %d "
             "ORDER BY album_chart DESC LIMIT 4;",
             current_genre, id);

    DBResult *res_r = db_query(query_rec);
    if (!res_r) {
        send_response(client, "200 OK", "application/json", "{\"status\":\"ok\",\"recommendations\":[]}");
        return;
    }

    char *json = (char *)malloc(4096);
    strcpy(json, "{\"status\":\"ok\",\"genre\":\"");
    strcat(json, current_genre);
    strcat(json, "\",\"recommendations\":[");

    MYSQL_ROW row;
    int first = 1;
    while ((row = mysql_fetch_row(res_r))) {
        char item[600];
        snprintf(item, sizeof(item),
                 "%s{\"id\":%s,\"year\":\"%s\",\"name\":\"%s\",\"artist\":\"%s\",\"genre\":\"%s\",\"chart\":%s}",
                 first ? "" : ",",
                 row[0] ? row[0] : "0",
                 row[1] ? row[1] : "",
                 row[2] ? row[2] : "",
                 row[3] ? row[3] : "",
                 row[4] ? row[4] : "",
                 row[5] ? row[5] : "0");
        strcat(json, item);
        first = 0;
    }
    strcat(json, "]}");
    db_free_result(res_r);

    send_response(client, "200 OK", "application/json", json);
    free(json);
}

// ================================================================================================================= //




// ================================================================================================================= //
// REGISTRO DE RUTAS
// ================================================================================================================= //
void init_billboard_routes() {
    add_route("POST", "/billboard/hit", route_post_billboard_hit);
    add_route("GET",  "/billboard/top", route_get_billboard_top);
    add_route("POST", "/billboard/recommend", route_post_billboard_recommend);
}
