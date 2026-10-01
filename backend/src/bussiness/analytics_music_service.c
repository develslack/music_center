#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <mysql/mysql.h>
#include "../system/routes.h"
#include "../system/db.h"
#include "analytics_music_service.h"

static void get_param_value(const char *body, const char *key, char *out, size_t out_size) {
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
// HANDLER: Registrar escucha individual en mc_user_listens
// ================================================================================================================= //
static void route_post_analytics_listen(int client, const char *body) {
    char user_id_str[16] = {0};
    char album_id_str[16] = {0};

    get_param_value(body, "user_id", user_id_str, sizeof(user_id_str));
    get_param_value(body, "album_id", album_id_str, sizeof(album_id_str));

    int user_id = atoi(user_id_str);
    int album_id = atoi(album_id_str);

    if (user_id <= 0 || album_id <= 0) {
        send_response(client, "400 Bad Request", "application/json", "{\"status\":\"error\",\"message\":\"Parametros invalidos\"}");
        return;
    }

    // UPSERT atómico en mc_user_listens
    char query[512];
    snprintf(query, sizeof(query),
             "INSERT INTO mc_user_listens (user_id, album_id, listen_count, first_listened_at, last_listened_at) "
             "VALUES (%d, %d, 1, NOW(), NOW()) "
             "ON DUPLICATE KEY UPDATE listen_count = listen_count + 1, last_listened_at = NOW();",
             user_id, album_id);

    MYSQL *conn = connect_db();
    if (conn) {
        mysql_query(conn, query);
        mysql_close(conn);
    }

    send_response(client, "200 OK", "application/json", "{\"status\":\"ok\"}");
}

// ================================================================================================================= //
// HANDLER: Obtener recomendaciones analíticas personalizadas
// ================================================================================================================= //
static void route_post_analytics_recommendations(int client, const char *body) {
    char user_id_str[16] = {0};
    get_param_value(body, "user_id", user_id_str, sizeof(user_id_str));
    int user_id = atoi(user_id_str);

    if (user_id <= 0) {
        send_response(client, "400 Bad Request", "application/json", "{\"status\":\"error\",\"message\":\"Usuario invalido\"}");
        return;
    }

    // 1. Averiguar el género más escuchado recientemente por este usuario
    char query_genre[512];
    snprintf(query_genre, sizeof(query_genre),
             "SELECT m.album_genre, COUNT(*) as cnt "
             "FROM mc_user_listens ul "
             "JOIN mc_music m ON ul.album_id = m.id "
             "WHERE ul.user_id = %d "
             "GROUP BY m.album_genre "
             "ORDER BY cnt DESC, MAX(ul.last_listened_at) DESC LIMIT 1;",
             user_id);

    DBResult *res_g = db_query(query_genre);
    MYSQL_ROW row_g;
    char preferred_genre[128] = {0};

    if (res_g && (row_g = mysql_fetch_row(res_g)) && row_g[0]) {
        strncpy(preferred_genre, row_g[0], sizeof(preferred_genre) - 1);
        db_free_result(res_g);
    } else {
        if (res_g) db_free_result(res_g);
    }

    char query_rec[1024];

    if (strlen(preferred_genre) > 0) {
        // Sugerir álbumes del género predilecto que NO haya escuchado todavía
        snprintf(query_rec, sizeof(query_rec),
                 "SELECT id, album_year, album_name, album_artist, album_genre, album_bio, album_path "
                 "FROM mc_music "
                 "WHERE album_genre = '%s' "
                 "AND id NOT IN (SELECT album_id FROM mc_user_listens WHERE user_id = %d) "
                 "ORDER BY album_chart DESC LIMIT 3;",
                 preferred_genre, user_id);
    } else {
        // Fallback para usuarios nuevos: sugerir los álbumes más populares en general
        snprintf(query_rec, sizeof(query_rec),
                 "SELECT id, album_year, album_name, album_artist, album_genre, album_bio, album_path "
                 "FROM mc_music "
                 "ORDER BY album_chart DESC LIMIT 3;");
    }

    DBResult *res_r = db_query(query_rec);
    if (!res_r) {
        send_response(client, "200 OK", "application/json", "{\"status\":\"ok\",\"recommendations\":[]}");
        return;
    }

    char *json = (char *)malloc(4096);
    strcpy(json, "{\"status\":\"ok\",\"genre\":\"");
    strcat(json, preferred_genre);
    strcat(json, "\",\"recommendations\":[");

    MYSQL_ROW row;
    int first = 1;
    while ((row = mysql_fetch_row(res_r))) {
        char item[600];
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
    strcat(json, "]}");
    db_free_result(res_r);

    send_response(client, "200 OK", "application/json", json);
    free(json);
}

void init_analytics_music_routes() {
    add_route("POST", "/analytics/listen", route_post_analytics_listen);
    add_route("POST", "/analytics/recommendations", route_post_analytics_recommendations);
}
