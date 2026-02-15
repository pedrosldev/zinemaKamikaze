-- Migración 002: Crear tabla de configuración de la aplicación
-- Permite almacenar settings dinámicos configurables desde admin

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(50) PRIMARY KEY COMMENT 'Clave única del setting',
  setting_value VARCHAR(255) NOT NULL COMMENT 'Valor del setting',
  description VARCHAR(500) NULL COMMENT 'Descripción del setting',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar configuración inicial: modo de selección de películas
INSERT IGNORE INTO app_settings (setting_key, setting_value, description) 
VALUES 
  ('selection_mode', 'normal', 'Modo de selección de películas: normal (1 película) | triple_choice (3 opciones) | catalog (catálogo completo)');

-- Registrar esta migración
INSERT IGNORE INTO schema_migrations (version, description) 
VALUES (2, 'Crear tabla app_settings y configuración de modo de selección');
