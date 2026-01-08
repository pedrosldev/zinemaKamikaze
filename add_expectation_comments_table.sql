-- Crear tabla para comentarios de expectativas
-- Ejecutar en MySQL para habilitar comentarios sobre las películas próximas a ver

CREATE TABLE expectation_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  film_id INT NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (film_id) REFERENCES reviews(film_id) ON DELETE CASCADE,
  INDEX idx_film_id (film_id)
);
