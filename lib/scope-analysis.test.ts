import test from "node:test";
import assert from "node:assert/strict";
import { analyzeLocalDeclarations } from "./scope-analysis";

test("finds obvious local variable declaration", () => {
  const result = analyzeLocalDeclarations('local message = "hello"\nprint(message)');
  assert.equal(result.declarations.length, 1);
  assert.equal(result.declarations[0].name, "message");
  assert.equal(result.declarations[0].form, "local");
});

test("finds obvious local function declaration", () => {
  const result = analyzeLocalDeclarations("local function greet() return true end");
  assert.equal(result.declarations.length, 1);
  assert.equal(result.declarations[0].name, "greet");
  assert.equal(result.declarations[0].form, "local-function");
});

test("does not treat text inside strings or comments as declarations", () => {
  const result = analyzeLocalDeclarations(
    'local actual = "-- local fake"\n-- local commentFake\nprint(actual)'
  );
  assert.deepEqual(result.declarations.map(item => item.name), ["actual"]);
});

test("clearly warns that this is not safe for renaming", () => {
  const result = analyzeLocalDeclarations("local value = 1");
  assert.ok(result.warnings.some(warning => warning.includes("not resolved")));
});
