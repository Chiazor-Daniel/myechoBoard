"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");

const ROOT = path.join(__dirname, ".."),
  source = fs.readFileSync(path.join(ROOT, "src", "server", "main.js"), "utf8"),
  snippetStart = source.indexOf("const CORRUPTED_TEXT_PATTERN"),
  snippetEnd = source.indexOf("function hasVisualCommand"),
  snippet = source.slice(snippetStart, snippetEnd);

assert.ok(snippet.includes("hasCorruptedWidgetText"), "detector exists in main.js");
const hasCorruptedWidgetText = new Function(`${snippet} return hasCorruptedWidgetText;`)();

test("invalid \\xHH JSON escapes are normalized so the full response survives", () => {
  const start = source.indexOf("function extractJson"),
    end = source.indexOf("function parsedModelResponse"),
    extractJson = new Function(`${source.slice(start, end)} return extractJson;`)();
  const result = extractJson('```json\n{"intent":"answer","commands":[{"tool":"draw_formula","latex":"2\\x2b 2"}]}\n```');
  assert.equal(result.commands[0].latex, "2+ 2");
});

test("unescaped LaTeX backslashes inside JSON strings survive parsing", () => {
  const start = source.indexOf("function extractJson"),
    end = source.indexOf("function parsedModelResponse"),
    extractJson = new Function(`${source.slice(start, end)} return extractJson;`)();
  // Model emitted \text and \frac with single backslashes inside a JSON string.
  const raw = String.raw`{"commands":[{"tool":"draw_formula","latex":"2\text{H}_2\text{O} \xrightleftharpoons 2\frac{a}{b} \underline{x}"},{"tool":"write_text","text":"line one\nline two"}]}`;
  const result = extractJson(raw);
  assert.equal(result.commands[0].latex, String.raw`2\text{H}_2\text{O} \xrightleftharpoons 2\frac{a}{b} \underline{x}`);
  // Intended \n line breaks stay real newlines.
  assert.equal(result.commands[1].text, "line one\nline two");
});

test("truncated multi-byte leftovers are flagged", () => {
  // The exact artifact from the water-cycle widget: "2 Hã„" instead of "2 H₂".
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "html_widget", html: "<text>2 Hã„O</text>" }] }), true);
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "write_text", text: "Oâ‚ labels" }] }), true);
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "html_widget", html: "<p>HÃ¤₂</p>" }] }), true);
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "html_widget", html: "<text>2Hã°</text>" }] }), true);
});

test("legitimate accented and symbol text passes", () => {
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "html_widget", html: "<p>2H₂O + café—style naïve</p>" }] }), false);
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "write_text", text: "l'été à São Paulo" }] }), false);
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "write_text", text: "90° ≈ 3.14, 中文 stays" }] }), false);
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "write_text", text: "10°C, ±½, 45°" }] }), false);
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "draw_formula", latex: "H_2O" }] }), false);
});

test("other tools and non-string fields are ignored", () => {
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "write_text", text: "clean" }, { tool: "draw", html: "Hã„" }] }), false);
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "html_widget", html: null }] }), false);
});

test("diagram_source source text is scanned too", () => {
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "diagram_source", source: 'flowchart LR\nA["2 Hã„O"] --> B' }] }), true);
  assert.equal(hasCorruptedWidgetText({ commands: [{ tool: "diagram_source", source: 'flowchart LR\nA["H₂O"] --> B' }] }), false);
});