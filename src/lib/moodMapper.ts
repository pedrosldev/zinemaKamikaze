/**
 * Configuración centralizada de moods para expectativas y reacciones
 */

export interface MoodConfig {
  emoji: string;
  label: string;
  description?: string;
}

/**
 * Moods para expectativa inicial (antes de ver la película)
 */
export const EXPECTATION_MOODS: Record<string, MoodConfig> = {
  excitement: {
    emoji: '🎉',
    label: 'Emoción',
    description: '¡Genial! Tenía ganas de verla'
  },
  fear: {
    emoji: '😱',
    label: 'Miedo',
    description: 'Esto va a ser duro...'
  },
  curiosity: {
    emoji: '🤔',
    label: 'Curiosidad',
    description: '¿Qué será esto?'
  },
  dread: {
    emoji: '😩',
    label: 'Horror',
    description: 'No puede ser...'
  },
  surprise: {
    emoji: '😲',
    label: 'Sorpresa',
    description: '¡Vaya! No me lo esperaba'
  },
  boredom: {
    emoji: '😴',
    label: 'Aburrimiento',
    description: 'Uf, qué pereza...'
  },
  neutral: {
    emoji: '😐',
    label: 'Neutral',
    description: 'Sin expectativas particulares'
  }
} as const;

/**
 * Moods para reacción final (después de ver la película)
 * Incluye todos los de expectativa más otros adicionales
 */
export const FINAL_MOODS: Record<string, MoodConfig> = {
  ...EXPECTATION_MOODS,
  satisfaction: {
    emoji: '😌',
    label: 'Satisfacción',
    description: 'Cumplió mis expectativas'
  },
  disappointment: {
    emoji: '😞',
    label: 'Decepción',
    description: 'No era lo que esperaba'
  },
  indifference: {
    emoji: '🤷',
    label: 'Indiferencia',
    description: 'Ni fu ni fa'
  },
  love: {
    emoji: '😍',
    label: 'Amor',
    description: '¡Me encantó!'
  },
  hate: {
    emoji: '🤬',
    label: 'Odio',
    description: 'Terrible experiencia'
  }
} as const;

/**
 * Obtiene la configuración de un mood según el tipo
 */
export function getMoodConfig(
  mood: string,
  type: 'expectation' | 'final' = 'expectation'
): MoodConfig | null {
  const moodMap = type === 'expectation' ? EXPECTATION_MOODS : FINAL_MOODS;
  return moodMap[mood] || null;
}

/**
 * Tipo para los nombres válidos de moods de expectativa
 */
export type ExpectationMood = keyof typeof EXPECTATION_MOODS;

/**
 * Tipo para los nombres válidos de moods finales
 */
export type FinalMood = keyof typeof FINAL_MOODS;
