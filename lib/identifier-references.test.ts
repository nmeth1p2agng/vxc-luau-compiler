import test from "node:test";
import assert from "node:assert/strict";
import { analyzeIdentifierReferences } from "./identifier-references";

test("lists identifier occurrences and declaration offsets", () => {
  const result = analyzeIdentifierReferences("local value = 1\nprint(value)");
  const summary = result.summaries.find(item => item.name === "value");
  assert.ok(summary);
  assert.equal(summary.declarationCount, 1);
  assert.equal(summary.otherOccurrenceCount, 1);
});

test("keeps repeated spelling grouped and warns about scope ambiguity", () => {
  const result = analyzeIdentifierReferences(
    "local item = 1\ndo local item = 2; print(item) end"
  );
  const summary = result.summaries.find(item => item.name === "item");
  assert.ok(summary);
  assert.equal(summary.declarationCount, 2);
  assert.ok(result.warnings.some(warning => warning.includes("shadowing") || warning.includes("scope")));
});

test("does not count identifier-looking text inside strings or comments", () => {
  const result = analyzeIdentifierReferences(
    'local value = "value"\n-- value\nprint(value)'
  );
  const valueTokens = result.occurrences.filter(item => item.name === "value");
  assert.equal(valueTokens.length, 2);
});
