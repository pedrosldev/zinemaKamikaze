-- Añadir columna para registrar quién seleccionó esta película
ALTER TABLE test_reviews 
ADD COLUMN selected_by VARCHAR(100) NULL 
COMMENT 'Nombre/usuario de quien seleccionó esta película con el token';
