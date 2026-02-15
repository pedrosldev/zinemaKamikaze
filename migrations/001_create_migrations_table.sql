-- Migración 001: Crear tabla de control de migraciones
-- Esta tabla registra qué migraciones se han ejecutado

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INT PRIMARY KEY COMMENT 'Número de versión de la migración',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de aplicación',
  description VARCHAR(255) NULL COMMENT 'Descripción de la migración'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar esta misma migración como aplicada
INSERT IGNORE INTO schema_migrations (version, description) 
VALUES (1, 'Crear tabla de control de migraciones');
