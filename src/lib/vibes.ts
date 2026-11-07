/**
 * Lista centralizada de vibes válidos.
 * Se usa en el select del admin y para validar lo que llega por API.
 */
export const VIBES = [
  { value: "eutanasia", label: "EUTANASIA" },
  { value: "vomito", label: "VOMITO" },
  { value: "aburrida", label: "ABURRIDA" },
  { value: "pasable", label: "PASABLE" },
  { value: "disfrutable", label: "DISFRUTABLE" },
  { value: "entretenida", label: "ENTRETENIDA" },
  { value: "mola", label: "MOLA" },
  { value: "obra maestra", label: "OBRA MAESTRA" },
] as const;

export const VIBE_VALUES = new Set<string>(VIBES.map((vibe) => vibe.value));

/** Devuelve un vibe válido o el fallback indicado. */
export function sanitizeVibe(value: unknown, fallback = "pasable"): string {
  return typeof value === "string" && VIBE_VALUES.has(value) ? value : fallback;
}
