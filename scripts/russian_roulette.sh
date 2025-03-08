#!/bin/bash

random_film() {
 local min=$1
 local max=$2
 local range=$(( max -min + 1))
 local random=$(( RANDOM % range + min ))
 echo $random
}

PATH_FILES="/run/media/piterxus/Elements/H/Lost File Results/avi/"
num_files=$(ls "$PATH_FILES"  | wc -l)

echo "$PATH_FILES contains $num_files"

random_index=$((RANDOM  % num_files +1))

echo "Select file $random_index"

selected_film=$(ls "$PATH_FILES" | sed -n "${random_index}p")

echo "Selected film: $selected_film"
