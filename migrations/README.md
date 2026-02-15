# Migraciones de Base de Datos

Sistema de control de versiones para cambios en la base de datos.

## 📋 Cómo funciona

1. **Archivos numerados**: Cada migración tiene un prefijo numérico (001, 002, etc.)
2. **Tabla de control**: `schema_migrations` registra qué migraciones se han aplicado
3. **Ejecución ordenada**: Las migraciones se ejecutan en orden numérico

## 🚀 Ejecutar migraciones

```bash
# Desarrollo local
npm run migrate

# Producción
npm run migrate:prod
```

## ✍️ Crear nueva migración

1. Crea archivo: `migrations/XXX_descripcion.sql` (XXX = número siguiente)
2. Escribe SQL DDL (CREATE, ALTER, INSERT, etc.)
3. Ejecuta `npm run migrate`

## 📁 Estructura

```
migrations/
  001_create_migrations_table.sql  ← Siempre debe ser la primera
  002_add_app_settings.sql
  003_tu_nueva_migracion.sql
```

## ⚠️ Importante

- **NO edites migraciones ya aplicadas** - Crea una nueva
- **Usa IF NOT EXISTS** cuando sea posible
- **Prueba en local antes de producción**
