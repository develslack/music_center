#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <mysql/mysql.h>
#include "../system/routes.h"
#include "../system/db.h"
#include "news_service.h"

// ================================================================================================================= //
// HANDLER: Novedades del Catálogo, Más Escuchados y Estadísticas Globales
// ================================================================================================================= //
static void route_get_news_summary(int client, const char *body) {
    // 1. Estadísticas Generales
    int total_albums = 0;
    int total_genres = 0;
    long total_listens = 0;

    DBResult *res_stat = db_query(
        "SELECT COUNT(*), COALESCE(SUM(album_chart), 0) FROM mc_music;"
    );
    if (res_stat) {
        MYSQL_ROW row_s = mysql_fetch_row(res_stat);
        if (row_s) {
            total_albums = row_s[0] ? atoi(row_s[0]) : 0;
            total_listens = row_s[1] ? atol(row_s[1]) : 0;
        }
        db_free_result(res_stat);
    }

    DBResult *res_g = db_query("SELECT COUNT(*) FROM mc_genre;");
    if (res_g) {
        MYSQL_ROW row_g = mysql_fetch_row(res_g);
        if (row_g) {
            total_genres = row_g[0] ? atoi(row_g[0]) : 0;
        }
        db_free_result(res_g);
    }

    char *json = (char *)malloc(8192);
    if (!json) {
        send_response(client, "500 Internal Server Error", "application/json", "{\"error\":\"Memoria insuficiente\"}");
        return;
    }

    snprintf(json, 8192,
             "{\"status\":\"ok\","
             "\"stats\":{\"total_albums\":%d,\"total_genres\":%d,\"total_listens\":%ld},"
             "\"latest\":[",
             total_albums, total_genres, total_listens);

    // 2. Últimos Álbumes Añadidos
    DBResult *res_latest = db_query(
        "SELECT id, album_year, album_name, album_artist, album_genre, album_bio, album_path "
        "FROM mc_music ORDER BY fecha_alta DESC, id DESC LIMIT 4;"
    );

    if (res_latest) {
        MYSQL_ROW row;
        int first = 1;
        while ((row = mysql_fetch_row(res_latest))) {
            char item[512];
            snprintf(item, sizeof(item),
                     "%s{\"id\":%s,\"year\":\"%s\",\"name\":\"%s\",\"artist\":\"%s\",\"genre\":\"%s\",\"path\":\"%s\"}",
                     first ? "" : ",",
                     row[0] ? row[0] : "0",
                     row[1] ? row[1] : "",
                     row[2] ? row[2] : "",
                     row[3] ? row[3] : "",
                     row[4] ? row[4] : "",
                     row[6] ? row[6] : "");
            strcat(json, item);
            first = 0;
        }
        db_free_result(res_latest);
    }

    strcat(json, "],\"most_listened\":[");

    // 3. Los Más Escuchados
    DBResult *res_top = db_query(
        "SELECT id, album_year, album_name, album_artist, album_genre, album_chart, album_path "
        "FROM mc_music WHERE album_chart > 0 ORDER BY album_chart DESC LIMIT 4;"
    );

    if (res_top) {
        MYSQL_ROW row;
        int first = 1;
        while ((row = mysql_fetch_row(res_top))) {
            char item[512];
            snprintf(item, sizeof(item),
                     "%s{\"id\":%s,\"year\":\"%s\",\"name\":\"%s\",\"artist\":\"%s\",\"genre\":\"%s\",\"chart\":%s,\"path\":\"%s\"}",
                     first ? "" : ",",
                     row[0] ? row[0] : "0",
                     row[1] ? row[1] : "",
                     row[2] ? row[2] : "",
                     row[3] ? row[3] : "",
                     row[4] ? row[4] : "",
                     row[5] ? row[5] : "0",
                     row[6] ? row[6] : "");
            strcat(json, item);
            first = 0;
        }
        db_free_result(res_top);
    }

    strcat(json, "]}");

    send_response(client, "200 OK", "application/json", json);
    free(json);
}

// ================================================================================================================= //
// REGISTRO DE RUTAS
// ================================================================================================================= //
void init_news_routes() {
    add_route("GET", "/news/summary", route_get_news_summary);
}
