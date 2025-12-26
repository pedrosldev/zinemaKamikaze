-- Añadir columna para la expectativa FINAL (después de ver la película)
ALTER TABLE test_reviews 
ADD COLUMN final_mood VARCHAR(50) NULL 
COMMENT 'Expectativa/sentimiento DESPUÉS de ver la película';
