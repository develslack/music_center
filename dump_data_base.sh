#!/bin/bash
fecha=`date +%d-%m-%Y`
archivo="queries/dumps/mc_database-$fecha.sql"
mysqldump --user=root --password=slack142 --host=localhost --routines --triggers mc_database > $archivo
chmod 777 $archivo



