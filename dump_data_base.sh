#!/bin/bash
fecha=`date +%d-%m-%Y`
archivo="queries/dumps/music_center-$fecha.sql"
mysqldump --user=root --password=slack142 --host=localhost --routines --triggers music_center > $archivo
chmod 777 $archivo



