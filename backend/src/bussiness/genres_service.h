#ifndef GENRES_SERVICE_H
#define GENRES_SERVICE_H

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "../system/ArrayList.h"

typedef struct{

    int id;
    char genre[101];

}Genres;

Genres* newGenre();
void genres_init_cache(ArrayList* alistGenres);
void genres_load_storage(ArrayList* alistGenres);

int genres_service_register(const char *body, char *error_msg, int error_size);
int genres_service_edit(const char *body, char *error_msg, int error_size);
int get_genres_service_id(const char *body, char *json_out, int out_size);

void init_genres_routes();


#endif
