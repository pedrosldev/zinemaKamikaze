# Sistema de Expectativas Dinámicas - Zinema Kamikaze

## 📋 Resumen

Se ha implementado un sistema que permite mostrar diferentes secuencias de flipbook según tu expectativa/impresión al enterarte de qué película te ha tocado comentar.

## 🎬 Funcionalidades Añadidas

### 1. **Campo en Base de Datos**
- Se añadió la columna `expectation_mood` a la tabla `test_reviews`
- Almacena el tipo de expectativa que tienes al saber qué película te tocó

### 2. **Selector en Panel Admin**
Ahora en `/admin` cuando edites una crítica pendiente, verás un nuevo selector con las opciones:
- 🎉 **EMOCIÓN** - ¡Genial! Tenía ganas de verla
- 😱 **MIEDO** - Esto va a ser duro...
- 🤔 **CURIOSIDAD** - ¿Qué será esto?
- 😩 **HORROR** - No puede ser...
- 😲 **SORPRESA** - ¡Vaya! No me lo esperaba
- 😴 **ABURRIMIENTO** - Uf, qué pereza...
- **(Sin definir)** - Muestra la secuencia neutral por defecto

### 3. **Secuencias de Flipbook Dinámicas**
Cada mood tiene su propia secuencia de imágenes:

- **excitement**: Usa imágenes de `/images/cartoon/` (frame1, frame2, frame3)
- **fear**: Usa secuencia de `/images/interview/` (0.png → coming.png)
- **curiosity**: Usa secuencia completa incluyendo carteles
- **dread**: Usa secuencia en reversa
- **surprise**: Mezcla imágenes de cartoon e interview
- **boredom**: Repite la misma imagen (efecto aburrido)
- **neutral**: Secuencia completa por defecto

## 🔧 Pasos para Activar

### 1. Actualizar Base de Datos
Ejecuta el siguiente comando SQL en tu base de datos:

```sql
USE zinemakamikaze;

ALTER TABLE test_reviews 
ADD COLUMN expectation_mood VARCHAR(50) NULL DEFAULT NULL 
AFTER viewing_period;
```

O ejecuta el archivo SQL incluido:
```bash
mysql -u root -h 127.0.0.1 -P 3306 zinemakamikaze < add_expectation_mood_column.sql
```

### 2. Reiniciar el Servidor de Desarrollo
```bash
pnpm run dev
```

## 📖 Cómo Usar

1. **Cuando un usuario use su token** y se genere una nueva película:
   - Se guardará en la BD con `expectation_mood = NULL` (neutro)
   - El flipbook mostrará la secuencia neutral

2. **Cuando tú sepas qué película te tocó**:
   - Ve a `/admin`
   - Selecciona la crítica pendiente
   - Elige tu expectativa en el selector "MI EXPECTATIVA AL ENTERARME"
   - Escribe tu crítica
   - Guarda

3. **Los usuarios verán**:
   - El flipbook adaptado a tu expectativa
   - La animación se ajusta dinámicamente al número de imágenes
   - Pueden controlar la velocidad del flipbook

## 🎨 Personalización

Para añadir nuevas secuencias o modificar las existentes, edita el objeto `moodSequences` en `src/components/Principal.astro`:

```typescript
const moodSequences: Record<string, string[]> = {
  excitement: [
    '/images/cartoon/frame1.png',
    '/images/cartoon/frame2.png',
    // ... más imágenes
  ],
  // ... otros moods
};
```

## 📁 Archivos Modificados

- ✅ `src/lib/db.ts` - Añadidas funciones para manejar expectation_mood
- ✅ `src/pages/admin/index.astro` - Añadido selector de mood
- ✅ `src/pages/api/update-review.ts` - Actualizado para guardar el mood
- ✅ `src/components/Principal.astro` - Flipbook dinámico según mood
- ✅ `add_expectation_mood_column.sql` - Script SQL para actualizar BD

## 🐛 Solución de Problemas

### El flipbook no cambia
- Verifica que guardaste el mood en el admin
- Recarga la página principal (F5)
- Revisa que las imágenes existan en `/public/images/`

### Error de base de datos
- Asegúrate de ejecutar el script SQL
- Verifica que la columna se creó: `DESCRIBE test_reviews;`

### El selector no aparece
- Limpia la caché del navegador
- Reinicia el servidor de desarrollo

## 🚀 Próximas Mejoras Sugeridas

- Añadir más tipos de expectativas
- Crear carpetas específicas para cada mood
- Permitir subir imágenes custom para cada película
- Vista previa del flipbook en el admin antes de guardar
