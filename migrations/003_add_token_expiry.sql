-- Migración 003: caducidad de los tokens de selección
-- Los tokens pasan a tener una fecha límite. Los tokens activos existentes
-- reciben 30 días adicionales desde la aplicación de esta migración.

ALTER TABLE trigger_tokens
  ADD COLUMN expires_at DATETIME NULL DEFAULT NULL AFTER is_active,
  ADD INDEX idx_trigger_tokens_expires_at (expires_at);

UPDATE trigger_tokens
SET expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY)
WHERE is_active = 1 AND expires_at IS NULL;

-- Registrar esta migración
INSERT IGNORE INTO schema_migrations (version, description)
VALUES (3, 'Añadir caducidad a trigger_tokens');
