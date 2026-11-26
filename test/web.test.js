import { test } from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../src/render.js";

// Rama de prueba: solo un test, para que la cobertura quede bajo el 70%
// y el Quality Gate QualityTaller2 falle a proposito.
test("renderPage muestra mensaje cuando no hay items", () => {
  assert.match(renderPage([]), /No hay items/);
});
