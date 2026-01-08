-- Instrucciones para añadir la columna expectation_mood
-- Copia y pega este comando en tu cliente MySQL (MySQL Workbench, phpMyAdmin, etc.)

ALTER TABLE reviews 
ADD COLUMN expectation_mood VARCHAR(50) NULL DEFAULT NULL 
AFTER viewing_period;
