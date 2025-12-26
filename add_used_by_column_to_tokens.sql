-- Añadir columna para registrar quién usó el token
ALTER TABLE trigger_tokens 
ADD COLUMN used_by VARCHAR(100) NULL 
COMMENT 'Nombre/usuario de quien usó este token';
