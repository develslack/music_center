#!/bin/bash
# -fsanitize=address (verifica donde se esta produciendo el error de segmentation fault)
clear
echo "# ======================================================= #"
echo "COMPILANDO APP (Music-Center)"
echo "# ======================================================= #"

gcc -Wall -g -std=gnu11  -o backend/bin/music-center \
    backend/src/system/ArrayList.h backend/src/system/ArrayList.c \
    backend/src/system/commonlib.h backend/src/system/commonlib.c \
    backend/src/system/db.h backend/src/system/db.c \
    backend/src/system/auth.h backend/src/system/auth.c \
    backend/src/system/users.h backend/src/system/users.c \
    backend/src/system/routes.h backend/src/system/routes.c \
    backend/src/system/hash.h backend/src/system/hash.c \
    backend/src/system/frontend_server.h backend/src/system/frontend_server.c \
    backend/src/system/backend_server.h backend/src/system/backend_server.c \
    backend/src/system/session_manager.h backend/src/system/session_manager.c \
    backend/src/system/system_struct.h backend/src/system/system_struct.c \
    backend/src/bussiness/users_service.h backend/src/bussiness/users_service.c \
    backend/src/bussiness/roles_service.h backend/src/bussiness/roles_service.c \
    backend/src/bussiness/genres_service.h backend/src/bussiness/genres_service.c \
    backend/src/bussiness/music_service.h backend/src/bussiness/music_service.c \
    backend/src/bussiness/player_service.h backend/src/bussiness/player_service.c \
    backend/src/bussiness/download_service.h backend/src/bussiness/download_service.c \
    backend/src/bussiness/billboard_service.h backend/src/bussiness/billboard_service.c \
    backend/src/bussiness/analytics_music_service.h backend/src/bussiness/analytics_music_service.c \
    backend/src/bussiness/news_service.h backend/src/bussiness/news_service.c \
    backend/src/main.c \
    -lpthread -lmysqlclient -lssl -lcrypto 2>&1 | tee comp_err.txt

if [ -f backend/bin/music-center ]; then
    clear
    echo "# ======================================================= #"
    echo "✅ COMPILACIÓN EXITOSA"
    echo "# ======================================================= #"
    echo "¿Qué acción desea realizar?"
    echo "  [1] Ejecutar en entorno de desarrollo"
    echo "  [2] Instalar en /opt/music-center/ (Requiere sudo)"
    echo "  [3] Salir"
    echo "# ======================================================= #"
    read -p "Seleccione una opción [1-3]: " resp

    case $resp in
        1)
            clear
            echo "Iniciando music-center en modo desarrollo..."
            cd backend/bin/
            ./music-center
            ;;
        2)
            clear
            echo "Iniciando instalación en /opt/music-center/..."
            DEST_DIR="/opt/music-center"

            echo "=> Creando estructura de directorios..."
            sudo mkdir -p $DEST_DIR/backend/bin/music
            sudo mkdir -p $DEST_DIR/backend/bin/covers
            sudo mkdir -p $DEST_DIR/frontend

            echo "=> Copiando binario del backend..."
            sudo cp backend/bin/music-center $DEST_DIR/backend/bin/
            sudo cp backend/bin/server.log $DEST_DIR/backend/bin/
            sudo cp backend/bin/system_verification.log $DEST_DIR/backend/bin/

            echo "=> Copiando archivos del frontend..."
            sudo cp -r frontend/* $DEST_DIR/frontend/

            echo "=> Estableciendo permisos de escritura para directorios dinámicos..."
            sudo chmod 777 $DEST_DIR/backend/bin/music
            sudo chmod 777 $DEST_DIR/backend/bin/covers

            echo "# ======================================================= #"
            echo "✅ Instalación completada con éxito."
            echo "   Ruta: $DEST_DIR"
            sudo chmod -R 777 $DEST_DIR
            echo "# ======================================================= #"
            echo "Iniciando la app..."
            $DEST_DIR/backend/bin/egl-sirhu > /dev/null 2>&1 &
            echo "# ======================================================= #"
            ;;
        3)
            clear
            echo "Saliendo. Solo se dejó el binario compilado en backend/bin/"
            ;;
        *)
            clear
            echo "Opción inválida. Saliendo..."
            ;;
    esac

else
    clear
    echo "# ======================================================= #"
    echo "❌ Error en la compilación. Revisa el archivo comp_err.txt"
    echo "# ======================================================= #"
fi
