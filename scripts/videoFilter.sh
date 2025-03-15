#!/bin/bash

# Verifica que se proporcionen los archivos de entrada y salida
if [ "$#" -ne 2 ]; then
    echo "Uso: $0 <archivo_entrada> <archivo_salida>"
    exit 1
fi

archivo_entrada="$1"
archivo_salida="$2"

# Filtra las líneas con extensiones .avi, .mp4 o .mkv y guarda en el archivo de salida
grep -Ei '\.(avi|mp4|mkv|mpg|wmv)$' "$archivo_entrada" > "$archivo_salida"

echo "Filtrado completado. Las líneas válidas se han guardado en $archivo_salida."
