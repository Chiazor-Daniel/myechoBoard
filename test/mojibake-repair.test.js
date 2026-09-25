"use strict";
const test = require("node:test"),
  assert = require("node:assert"),
  fs = require("node:fs"),
  path = require("node:path");

const ROOT = path.join(__dirname, ".."),
  source = fs.readFileSync(path.join(ROOT, "src", "server", "main.js"), "utf8"),
  snippetStart = source.indexOf("const HIGH_LATIN_CHAR"),
  snippetEnd = source.indexOf("function repairCommandText"),
  snippet = source.slice(snippetStart, snippetEnd);

assert.ok(snippet.includes("repairMojibakeRun") && snippet.includes("repairVisibleText"), "repair helpers exist in main.js");
const repairVisibleText = new Function(`${snippet} return repairVisibleText;`)();

test("double-encoded model text is repaired to real characters", () => {
  assert.equal(repairVisibleText("90Â° (0, 1)"), "90° (0, 1)");
  assert.equal(repairVisibleText("âˆš3/2"), "√3/2");
  assert.equal(repairVisibleText("120Â° (âˆ’1/2, âˆš3/2)"), "120° (−1/2, √3/2)");
  assert.equal(repairVisibleText("45Â° (âˆš2/2, âˆš2/2)"), "45° (√2/2, √2/2)");
});

test("doubly mojibaked text is repaired to a fixpoint", () => {
  // "°" encoded twice through windows-1252 arrives as "Ã‚Â°"
  const doubleEncoded = Buffer.from("°", "utf8").toString("latin1");
  assert.notEqual(doubleEncoded, "°");
  const twice = Buffer.from(doubleEncoded, "utf8").toString("latin1");
  assert.equal(repairVisibleText(`120${twice}`), "120°");
});

test("literal \\uXXXX escape text is replaced with real characters", () => {
  assert.equal(repairVisibleText("literal \\u2212 minus"), "literal − minus");
  assert.equal(repairVisibleText("café + \\u00b0"), "café + °");
});

test("legitimate text passes through unchanged", () => {
  assert.equal(repairVisibleText("legit café naïve"), "legit café naïve");
  assert.equal(repairVisibleText("plain text no symbols"), "plain text no symbols");
  assert.equal(repairVisibleText("中文 stays 中文"), "中文 stays 中文");
  assert.equal(repairVisibleText("curly “quotes” and — dashes stay"), "curly “quotes” and — dashes stay");
  assert.equal(repairVisibleText("π ≈ 3.14, θ ≤ 2π"), "π ≈ 3.14, θ ≤ 2π");
  assert.equal(repairVisibleText(""), "");
  assert.equal(repairVisibleText("a"), "a");
});