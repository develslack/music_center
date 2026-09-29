#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <pthread.h>
#include "system/system_struct.h"
#include "system/frontend_server.h"
#include "system/backend_server.h"
#include "system/session_manager.h"
#include "system/ArrayList.h"
#include "bussiness/roles_service.h"
#include "bussiness/genres_service.h"
#include "bussiness/music_service.h"





int main() {

    // 1. Limpieza visual de la terminal de Slackware/Debian
    system("clear");
    printf("=== AUDITORÍA DE INFRAESTRUCTURA DE SISTEMA (FAIL-FAST) ===\n");

    // 2. Activamos el blindaje de sockets primero
    system_blindar_senales();

    // 3. Freno de mano: Si hay menos de 4 núcleos, esta función imprime el error,
    // escribe en el log y ejecuta un exit(EXIT_FAILURE), frenando el main ACÁ mismo.
    system_verificar_y_mapear_hardware();

    // 4. Iniciamos session_manager como controlador del sistema
    session_manager_init();


    // ================================================================================= //
    // 🚀 SI LLEGA A ESTE PUNTO, EL HARDWARE ESTÁ BLINDADO Y ES APTO PARA 24x365
    // ================================================================================= //
    printf("\n=== INICIANDO CONFIGURACIÓN DE MEMORIA DEL MAESTRO ===\n");

    // 1. SE CREA LOS ARRAYLIST
    //ArrayList* alist_roles = al_newArrayList();
    //roles_init_cache(alist_roles);
    //roles_load_storage(alist_roles);

    // 2. SE CREA EL ARRAYLIST PARA GENEROS MUSICALES
    ArrayList* alist_genres = al_newArrayList();
    genres_init_cache(alist_genres);
    genres_load_storage(alist_genres);

    // 2. SE CREA EL ARRAYLIST PARA ALBUNES
    ArrayList* alist_music = al_newArrayList();
    music_init_cache(alist_music);
    music_load_storage(alist_music);

    // 40. INCIALAR CACHE DE SESSION MANAGER (MODULAR)
    session_manager_init();

    printf("Iniciando aplicación...\n");

    // 🔹 Levantar frontend
    start_frontend_server(5001, "../../frontend/templates/views");
    //  └── dentro de ./frontend deben estar index.html y dashboard.html

    // 🔹 Luego iniciar backend normalmente
    start_backend(5000);

    return 0;
}


