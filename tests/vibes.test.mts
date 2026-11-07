import test from "node:test";
import assert from "node:assert/strict";
import { VIBES, VIBE_VALUES, sanitizeVibe } from "../src/lib/vibes.ts";

test("la lista de vibes no tiene valores duplicados", () => {
  assert.equal(VIBE_VALUES.size, VIBES.length);
});

test("todos los valores y etiquetas son texto no vacío", () => {
  for (const vibe of VIBES) {
    assert.equal(typeof vibe.value, "string");
    assert.ok(vibe.value.length > 0);
    assert.equal(typeof vibe.label, "string");
    assert.ok(vibe.label.length > 0);
  }
});

test("VIBE_VALUES contiene exactamente los valores de la lista", () => {
  for (const vibe of VIBES) {
    assert.equal(VIBE_VALUES.has(vibe.value), true);
  }
  assert.equal(VIBE_VALUES.has("inexistente"), false);
});

test("sanitizeVibe acepta todos los vibes válidos", () => {
  for (const vibe of VIBES) {
    assert.equal(sanitizeVibe(vibe.value), vibe.value);
  }
});

test("sanitizeVibe rechaza valores no válidos y usa el fallback", () => {
  assert.equal(sanitizeVibe("inexistente"), "pasable");
  assert.equal(sanitizeVibe(""), "pasable");
  assert.equal(sanitizeVibe(undefined), "pasable");
  assert.equal(sanitizeVibe(null), "pasable");
  assert.equal(sanitizeVibe(42), "pasable");
  assert.equal(sanitizeVibe({}), "pasable");
  assert.equal(sanitizeVibe("MOLA"), "pasable");
});

test("sanitizeVibe respeta un fallback personalizado", () => {
  assert.equal(sanitizeVibe("inexistente", "eutanasia"), "eutanasia");
  assert.equal(sanitizeVibe("mola", "eutanasia"), "mola");
});
