-- Añadir soporte para video críticas de YouTube
-- Ejecutar en MySQL Workbench o tu cliente de MySQL

-- 1. Añadir columna para el ID del video de YouTube
ALTER TABLE reviews 
ADD COLUMN youtube_id VARCHAR(20) NULL 
AFTER poster_url;

-- 2. Hacer la columna review opcional (permite solo video sin texto)
ALTER TABLE reviews 
MODIFY COLUMN review TEXT NULL;

-- 3. Añadir índice para consultas por film_id (para múltiples reviews)
ALTER TABLE reviews 
ADD INDEX idx_film_id (film_id);

-- 4. Opcional: Añadir fecha de visualización para ordenar reviews cronológicamente
ALTER TABLE reviews 
ADD COLUMN watched_date DATE NULL 
AFTER year;
