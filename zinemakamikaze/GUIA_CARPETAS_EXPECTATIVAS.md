# 🎬 Guía de Carpetas de Expectativas

## 📁 Estructura Creada

Se han creado las siguientes carpetas en `/public/images/expectations/`:

```
expectations/
├── neutral/        → Secuencia por defecto (cuando aún no has definido tu mood)
├── excitement/     → 🎉 Cuando la película te emociona
├── fear/           → 😱 Cuando te da miedo/preocupación
├── curiosity/      → 🤔 Cuando tienes curiosidad
├── dread/          → 😩 Cuando es una pesadilla
├── surprise/       → 😲 Cuando te sorprende
└── boredom/        → 😴 Cuando te da pereza
```

## 🖼️ Cómo Añadir Imágenes

### 1. Nombrar las Imágenes
Nombra tus imágenes numéricamente en orden de aparición:
- `1.png` - Primera imagen de la secuencia
- `2.png` - Segunda imagen
- `3.png` - Tercera imagen
- etc.

### 2. Número de Imágenes
- Puedes tener **entre 3 y 10 imágenes** por mood
- La animación se ajusta automáticamente
- Recomendado: **5-7 imágenes** para mejor efecto

### 3. Formato
- **Formato**: PNG o JPG
- **Relación de aspecto**: 16:9 (recomendado)
- **Resolución**: Mínimo 1280x720px

## 📝 Ejemplo de Uso

### Carpeta `neutral/` (Secuencia por defecto)
Actualmente configurada con 7 imágenes. Esta es la que verán los usuarios cuando se genere una película y tú aún no hayas definido tu reacción.

Coloca aquí una secuencia genérica, por ejemplo:
- `1.png` - Imagen de espera/pensando
- `2.png` - Mirando información
- `3.png` - Evaluando
- etc.

### Carpeta `excitement/` (Emoción)
Para cuando te emociona la película. Ejemplo:
- `1.png` - Rostro normal
- `2.png` - Empieza a sonreír
- `3.png` - Sonrisa amplia
- `4.png` - Emocionado
- `5.png` - ¡Super emocionado!

### Carpeta `fear/` (Miedo)
Para cuando te preocupa la película:
- `1.png` - Tranquilo
- `2.png` - Empieza a preocuparse
- `3.png` - Cara de preocupación
- `4.png` - Nervioso
- `5.png` - Pánico

## ⚙️ Modificar el Número de Imágenes

Si quieres más o menos imágenes en alguna secuencia, edita el archivo:
`src/components/Principal.astro`

Busca el objeto `moodSequences` y añade/quita líneas:

```typescript
excitement: [
  '/images/expectations/excitement/1.png',
  '/images/expectations/excitement/2.png',
  '/images/expectations/excitement/3.png',
  // Añade más aquí si tienes más imágenes
],
```

## 🎨 Consejos Creativos

1. **Usa secuencias de tu cara/reacción**
2. **Pueden ser fotos, ilustraciones, o gifs frame by frame**
3. **Mantén coherencia visual en cada mood**
4. **La última imagen puede ser más dramática/exagerada**

## 🔄 Flujo Completo

1. Usuario usa token → Película seleccionada
2. Se muestra flipbook **neutral** (7 imágenes por defecto)
3. Tú ves qué película te tocó
4. Vas a `/admin` y seleccionas tu mood real
5. El flipbook cambia a la secuencia de ese mood
6. Los usuarios ven tu reacción auténtica
