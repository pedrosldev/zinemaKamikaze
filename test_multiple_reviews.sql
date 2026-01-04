-- Script para generar 3 visionados adicionales basados en el film_id 19574
-- Primero verifica que el registro existe y muestra sus datos

-- Ver el registro original (primero de ese film_id)
SELECT * FROM test_reviews WHERE film_id = 19574 LIMIT 1;

-- IMPORTANTE: Revisa los datos arriba y ejecuta los INSERT de abajo

-- Visionado #2 (primer adicional)
INSERT INTO test_reviews 
(film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, final_mood, selected_by, youtube_id, watched_date)
SELECT 
    film_id,
    title,
    year,
    CONCAT('Segunda vez que veo esta película.\n\n', SUBSTRING(COALESCE(review, ''), 1, 200), '\n\nCon cada visionado descubro más detalles.'),
    vibe,
    poster_url,
    false,
    'excitement',
    'satisfaction',
    'María',
    '4Ms5nz1lPPI',
    DATE_ADD(COALESCE(watched_date, CURDATE()), INTERVAL 3 MONTH)
FROM test_reviews 
WHERE film_id = 19574
LIMIT 1;

-- Visionado #3 (segundo adicional)
INSERT INTO test_reviews 
(film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, final_mood, selected_by, youtube_id, watched_date)
SELECT 
    film_id,
    title,
    year,
    CONCAT('Tercera vez y sigue siendo increíble.\n\n', SUBSTRING(COALESCE(review, ''), 1, 150), '\n\nLa dirección es magistral.'),
    vibe,
    poster_url,
    false,
    'curiosity',
    'love',
    'Carlos',
    '4Ms5nz1lPPI',
    DATE_ADD(COALESCE(watched_date, CURDATE()), INTERVAL 6 MONTH)
FROM test_reviews 
WHERE film_id = 19574
LIMIT 1;

-- Visionado #4 (tercer adicional)
INSERT INTO test_reviews 
(film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, final_mood, selected_by, youtube_id, watched_date)
SELECT 
    film_id,
    title,
    year,
    CONCAT('Cuarta vez viendo esta joya.\n\n', SUBSTRING(COALESCE(review, ''), 1, 180), '\n\nUna obra maestra atemporal.'),
    vibe,
    poster_url,
    false,
    'excitement',
    'love',
    'Anónimo',
    '4Ms5nz1lPPI',
    DATE_ADD(COALESCE(watched_date, CURDATE()), INTERVAL 9 MONTH)
FROM test_reviews 
WHERE film_id = 19574
LIMIT 1;

-- Verificar que se crearon correctamente
SELECT id, film_id, title, selected_by, youtube_id, watched_date 
FROM test_reviews 
WHERE film_id = 19574
ORDER BY id ASC;

