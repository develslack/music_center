 
#ifndef MUSIC_SERVICE_H
#define MUSIC_SERVICE_H

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "../system/ArrayList.h"

typedef struct{

    int  id;
    char album_year[5];
    char album_name[201];
    char album_artist[201];
    char album_genre[101];
    char album_art[201];
    char album_bio[201];
    char album_path[201];
    int  album_chart;

}Music;

Music* newMusic();
void music_init_cache(ArrayList* alistMusic);
void music_load_storage(ArrayList* alistMusic);

int music_service_register(const char *body, char *error_msg, int error_size);
int music_service_edit(const char *body, char *error_msg, int error_size);
int get_music_service_id(const char *body, char *json_out, int out_size);

void init_music_routes();


#endif
