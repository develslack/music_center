#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <openssl/sha.h>
#include <mysql/mysql.h>
#include "../system/hash.h"
#include "../system/routes.h"
#include "../system/db.h"
#include "../system/ArrayList.h"
#include "genres_service.h"

// ===================================================================================================================================== //

// Variable estática para la memoria local del módulo
static ArrayList* pListGenresLocal = NULL;

// CONSTRUCTOR
// ===================================================================================================================================== //
Genres* newGenre(){

    Genres* oneGenre = (Genres*)malloc(sizeof(Genres));

    if(oneGenre != NULL){
        memset(oneGenre, 0, sizeof(Genres));
    }

    return oneGenre;

} // END OF FUNCTION

// ===================================================================================================================================== //

// ===================================================================================================================================== //
// Iniciliacion de cache
// ===================================================================================================================================== //
void genres_init_cache(ArrayList* alistGenres) {

    if(alistGenres != NULL) {
        // 2. ASIGNACIÓN CRÍTICA: Aquí guardamos la dirección de memoria que viene del main
        pListGenresLocal = alistGenres;
        printf("===================================================================================\n");
        printf("✅ Negociando espacio en memoria para el servicio de [ Géneros Musicales ].\n");
    } else {
        printf("===================================================================================\n");
        printf("⚠️ Advertencia: Se intentó inicializar la caché de [ Géneros Musicales ] con NULL.\n");
    }
} // END OF FUNCTION

// ===================================================================================================================================== //


// ===================================================================================================================================== //
// cargar datos de permisos en ArrayList
// ===================================================================================================================================== //
void genres_load_storage(ArrayList* alistGenres) {

    if(alistGenres == NULL) return;

    // Ajusta la query a tus necesidades
    DBResult *res = db_query("SELECT * FROM mc_genre");
    if (!res) return;

    MYSQL_ROW row;
    while ((row = mysql_fetch_row(res))) {

        Genres* nGenre = newGenre();

        if (nGenre != NULL) {
            nGenre->id = atoi(row[0]);
            strncpy(nGenre->genre, row[1], sizeof(nGenre->genre) -1);

            alistGenres->add(alistGenres, nGenre);
        }
    }

    db_free_result(res);
    printf("===================================================================================\n");
    printf("📊 Memoria: %d Géneros Musicales cargados. Espacio reservado: %d slots.\n", alistGenres->len(alistGenres), alistGenres->reservedSize);

} // END OF FUNCTION

// ===================================================================================================================================== //


// ===================================================================================================================================== //
// función auxiliar: obtiene valor de key=valor en el body
// ===================================================================================================================================== //
static void get_genre_value(const char *body, const char *key, char *out, size_t out_size) {

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

} // END OF FUNCTION


// ===================================================================================================================================== //


// ===================================================================================================================================== //
// 🔒 STORED PROCEDURES: Prepared Statements (GENEROS)
// ===================================================================================================================================== //
static int sp_insertar_genre(const char* genre) {
    MYSQL_STMT *stmt;
    MYSQL_BIND bind_param[1];
    MYSQL_BIND bind_result[1];
    int nuevo_id = 0;
    const char *query = "CALL sp_insertar_genre(?)";

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
    bind_param[0].buffer = (char *)genre;
    bind_param[0].buffer_length = strlen(genre);


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

} // END OF FUNCTION


// ===================================================================================================================================== //


static int sp_editar_genre(int id, const char* genre) {
    MYSQL_STMT *stmt;
    MYSQL_BIND bind_param[2];
    const char *query = "CALL sp_editar_genre(?, ?)";

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
    bind_param[1].buffer = (char *)genre;
    bind_param[1].buffer_length = strlen(genre);


    if (mysql_stmt_bind_param(stmt, bind_param) || mysql_stmt_execute(stmt)) {
        mysql_stmt_close(stmt);
        mysql_close(conn);
        return 0;
    }

    while (!mysql_stmt_next_result(stmt)) mysql_stmt_free_result(stmt);
    mysql_stmt_close(stmt);
    mysql_close(conn);
    return 1;

} // END OF FUNCTION


// ===================================================================================================================================== //


// ===================================================================================================================================== //
// FUNCION PARA REGISTRAR NUEVO GENERO MUSICAL
// ===================================================================================================================================== //
int genre_service_register(const char *body, char *error_msg, int error_size) {

    char genre[101];
    char d_genre[101];

    get_genre_value(body,"genre", genre, sizeof(genre));
    url_decode(d_genre, genre);

    if (strlen(d_genre) == 0) {
        snprintf(error_msg, error_size, "Debe ingresar un género musical.");
        return 0;
    }

    // 1. VERIFICACIÓN DE DUPLICADOS EN MEMORIA (ArrayList)
    // Es más rápido que consultar la DB nuevamente
    if (pListGenresLocal != NULL) {

        for (int i = 0; i < pListGenresLocal->len(pListGenresLocal); i++) {

            Genres* genre = (Genres*) pListGenresLocal->get(pListGenresLocal, i);

            if (strcasecmp(genre->genre, d_genre) == 0) {

                snprintf(error_msg, error_size, "Error: Género Musical '%s' existente.", d_genre);
                return 0;
            }
        }
    }

    // 2. INSERCIÓN EN BASE DE DATOS

    int nuevo_id = sp_insertar_genre(d_genre);

    if (nuevo_id <= 0) {
        snprintf(error_msg, error_size, "Error interno al guardar en la base de datos.");
        return 0;
    }

    Genres* nuevoGenre = newGenre();

    if (nuevoGenre) {

        // Aprovechamos para inicializar el bloque de memoria limpio
        memset(nuevoGenre, 0, sizeof(Genres));

        nuevoGenre->id = nuevo_id;
        strncpy(nuevoGenre->genre, d_genre, sizeof(nuevoGenre->genre) -1);

        // Sincronizamos el ArrayList inmediatamente
        pListGenresLocal->add(pListGenresLocal, nuevoGenre);

        printf("✅ Sincronización exitosa: Género Musical '%s' (ID: %d) añadido a RAM.\n",
                d_genre, nuevo_id);
    }

    return 1;

} // END OF FUNCTION


// ===================================================================================================================================== //

// ===================================================================================================================================== //
// FUNCION EDICIÓN DE ACTIVIDAD
// ===================================================================================================================================== //
int genre_service_edit(const char *body, char *error_msg, int error_size) {

    char id_str[32];
    char genre[101];
    char d_genre[101];

    // 1. Extraer datos del body
    get_genre_value(body, "id", id_str, sizeof(id_str));

    get_genre_value(body,"genre", genre, sizeof(genre));
    url_decode(d_genre, genre);


    int id_a_editar = atoi(id_str);

    if (id_a_editar <= 0 || strlen(d_genre) == 0) {
        snprintf(error_msg, error_size, "ID ó Género Musical no completados");
        return 0;
    }

    // 2. VERIFICACIÓN DE EXISTENCIA Y DUPLICADOS EN MEMORIA
    if (pListGenresLocal != NULL) {

        for (int i = 0; i < pListGenresLocal->len(pListGenresLocal); i++) {

            Genres* nGenre = (Genres*) pListGenresLocal->get(pListGenresLocal, i);

            // Si el nombre ya existe en otro ID, rebotamos la edición
            if (nGenre->id != id_a_editar && strcasecmp(nGenre->genre, d_genre) == 0) {
                snprintf(error_msg, error_size, "Error: género Musical Existente.");
                return 0;
            }
        }
    }

    // 3. ACTUALIZAR EN BASE DE DATOS (Blindado)
    if (sp_editar_genre(id_a_editar, d_genre) == 0) {
        snprintf(error_msg, error_size, "Error al actualizar en la base de datos.");
        return 0;
    }

    // 4. ACTUALIZAR EN MEMORIA (ArrayList)
    if (pListGenresLocal != NULL) {

        for (int i = 0; i < pListGenresLocal->len(pListGenresLocal); i++) {

            Genres* nGenre = (Genres*) pListGenresLocal->get(pListGenresLocal, i);

            if (nGenre->id == id_a_editar) {
                // Actualizamos el puntero directamente en la memoria
                strncpy(nGenre->genre, d_genre, sizeof(nGenre->genre) -1);
                printf("✅ Memoria sincronizada: Género Musical ID %d actualizado a '%s'.\n", id_a_editar, d_genre);
                break;
            }
        }
    }

    return 1;

} // END OF FUNCTION


// ===================================================================================================================================== //


// ===================================================================================================================================== //
// LOGICA QUE RETORNA UN REGISTRO AL SER CONSULTADO POR ID
// ===================================================================================================================================== //
int get_genre_service_id(const char *body, char *json_out, int out_size) {

    char id_str[10];
    get_genre_value(body, "id", id_str, sizeof(id_str));

    if (strlen(id_str) == 0) {
        snprintf(json_out, out_size, "{ \"status\": \"error\", \"message\": \"ID no provisto\" }");
        return 0;
    }

    char query[512];

    snprintf(query, sizeof(query),
             "SELECT * FROM mc_genre WHERE id = %s LIMIT 1;", id_str);

    DBResult *res = db_query(query);

    // 🔹 CORRECCIÓN AQUÍ: Usamos db_fetch_row o la función correspondiente de tu db.h
    // Si tu db.h usa mysql_fetch_row directamente:
    MYSQL_ROW row;

    if (!res || !(row = mysql_fetch_row(res))) {
        snprintf(json_out, out_size, "{ \"status\": \"error\", \"message\": \"Género Musical no encontrado\" }");
        if (res) db_free_result(res);
        return 0;
    }

    // Construimos el JSON usando los índices del array 'row'
    snprintf(json_out, out_size,
             "{ \"id\": %s, \"genre\": \"%s\" }",
             row[0] ? row[0] : "0",
             row[1] ? row[1] : "");

    db_free_result(res);
    return 1;

} // END OF FUNCTION


// ===================================================================================================================================== //


// ===================================================================================================================================== //
// ROUTES HANDLERS
// ===================================================================================================================================== //

// ===================================================================================================================================== //
// Handler POST para el registro
// ===================================================================================================================================== //
static void route_post_genre(int client, const char *body) {

    char error_msg[256];

    if (genre_service_register(body, error_msg, sizeof(error_msg))) {
        send_response(client, "200 OK", "application/json", "{ \"status\": \"ok\", \"message\": \"Género Musical creado y caché actualizada\" }");
    } else {
        char response[512];
        snprintf(response, sizeof(response), "{ \"status\": \"error\", \"message\": \"%s\" }", error_msg);
        send_response(client, "400 Bad Request", "application/json", response);
    }

} // END OF FUNCTION

// ===================================================================================================================================== //


// ===================================================================================================================================== //
// Handler POST para la edición
// ===================================================================================================================================== //
static void route_post_genre_edit(int client, const char *body) {

    char error_msg[256];

    if (genre_service_edit(body, error_msg, sizeof(error_msg))) {
        send_response(client, "200 OK", "application/json", "{ \"status\": \"ok\", \"message\": \"Género Musical actualizado correctamente\" }");
    } else {
        char response[512];
        snprintf(response, sizeof(response), "{ \"status\": \"error\", \"message\": \"%s\" }", error_msg);
        send_response(client, "400 Bad Request", "application/json", response);
    }

} // END OF FUNCTION

// ===================================================================================================================================== //

// ===================================================================================================================================== //
// ROUTES FOR LIST GENEROS MUSICALES
// ===================================================================================================================================== //
static void route_get_genres_list(int client, const char *body) {


    // Ahora pListMedicosLocal ya no debería ser NULL
    if (pListGenresLocal == NULL) {
        printf("❌ Error crítico: pListGenresLocal sigue siendo NULL en el handler.\n");
        send_response(client, "500 Internal Error", "application/json", "{\"error\":\"Error de vinculación de memoria\"}");
        return;
    }

    // Estimamos el tamaño del JSON (aprox 150 bytes por médico)
    size_t total_registros = pListGenresLocal->len(pListGenresLocal);
    size_t buffer_size = (total_registros * 650) + 512;
    char *json = (char*) calloc(1, buffer_size); // calloc limpia la memoria

    if (json == NULL) {
        send_response(client, "500 Internal Server Error", "text/plain", "Error de memoria");
        return;
    }

    strcpy(json, "[");

    for (int i = 0; i < total_registros; i++) {

        Genres* oneGenre = (Genres*) pListGenresLocal->get(pListGenresLocal, i);

        char item[600];

        // Armamos el objeto JSON
        snprintf(item, sizeof(item),
            "{\"id\": %d, \"genre\": \"%s\" }%s",
            oneGenre->id, oneGenre->genre, (i < total_registros - 1) ? "," : "");

        strcat(json, item);
    }
    strcat(json, "]");

    send_response(client, "200 OK", "application/json", json);
    free(json); // Liberamos el buffer del JSON


} // END OF FUNCTION

// ===================================================================================================================================== //

// ===================================================================================================================================== //
// ROUTE OR GET ONE REGESTRY
// ===================================================================================================================================== //
static void route_get_genre_by_id(int client, const char *body) {

    char response_json[1024];

    if (get_genre_service_id(body, response_json, sizeof(response_json))) {
        send_response(client, "200 OK", "application/json", response_json);
    } else {
        send_response(client, "404 Not Found", "application/json", response_json);
    }

} //END OF FUNCTION

// ===================================================================================================================================== //

// ===================================================================================================================================== //
// INIT ALL ROUTES GENEROS MUSICALES
// ===================================================================================================================================== //
void init_genres_routes() {

    add_route("GET", "/genres/list", route_get_genres_list); // endpoint para listar
    add_route("POST", "/genres/add", route_post_genre); // endpoint para alta de nuevo registro
    add_route("POST", "/genres/edit", route_post_genre_edit); // endpoint para editar un registro
    add_route("POST", "/genres/get", route_get_genre_by_id); // endpoint para consultar un registro por ID

} // END OF FUNCION

// ===================================================================================================================================== //
