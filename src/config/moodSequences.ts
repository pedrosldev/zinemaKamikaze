/**
 * Configuración de secuencias de imágenes para los diferentes moods de expectativas.
 * Cada mood tiene su carpeta en /images/expectations/
 * Las imágenes dentro deben nombrarse: 1.png, 2.png, 3.png, etc. en el orden deseado
 */
export const moodSequences: Record<string, string[]> = {
  excitement: [
    '/images/expectations/excitement/1.png',
    '/images/expectations/excitement/2.png',
    '/images/expectations/excitement/3.png',
    '/images/expectations/excitement/4.png',
    '/images/expectations/excitement/5.png'
  ],
  fear: [
    '/images/expectations/fear/1.png',
    '/images/expectations/fear/2.png',
    '/images/expectations/fear/3.png',
    '/images/expectations/fear/4.png',
    '/images/expectations/fear/5.png'
  ],
  curiosity: [
    '/images/expectations/curiosity/1.png',
    '/images/expectations/curiosity/2.png',
    '/images/expectations/curiosity/3.png',
    '/images/expectations/curiosity/4.png',
    '/images/expectations/curiosity/5.png'
  ],
  dread: [
    '/images/expectations/dread/1.png',
    '/images/expectations/dread/2.png',
    '/images/expectations/dread/3.png',
    '/images/expectations/dread/4.png',
    '/images/expectations/dread/5.png'
  ],
  surprise: [
    '/images/expectations/surprise/1.png',
    '/images/expectations/surprise/2.png',
    '/images/expectations/surprise/3.png',
    '/images/expectations/surprise/4.png',
    '/images/expectations/surprise/5.png'
  ],
  boredom: [
    '/images/expectations/boredom/1.png',
    '/images/expectations/boredom/2.png',
    '/images/expectations/boredom/3.png',
    '/images/expectations/boredom/4.png',
    '/images/expectations/boredom/5.png'
  ]
};

/**
 * Secuencia de imágenes por defecto.
 * Usa las imágenes que ya existen en /images/interview/
 */
export const defaultSequence = [
  '/images/interview/0.png',
  '/images/interview/cartel_0.png',
  '/images/interview/1.png',
  '/images/interview/2.png',
  '/images/interview/3.png',
  '/images/interview/cartel_1.png',
  '/images/interview/coming.png'
];
