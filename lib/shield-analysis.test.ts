import test from "node:test";
import assert from "node:assert/strict";
import { analyzeShieldSource } from "./shield-analysis";

test("creates a unified report for a simple Luau source", () => {
const source =
"local message = 'hello'\n" +
"local function greet(name)\n" +
"  print(message, name)\n" +
"end";

const report = analyzeShieldSource(source);

assert.equal(report.sourceLength, source.length);
assert.ok(report.tokenCount > 0);
assert.ok(report.findings.length > 0);
assert.ok(report.warnings.length > 0);
});

test("reports local declarations", () => {
const report = analyzeShieldSource("local value = 123");

assert.ok(
report.findings.some(
finding =>
finding.category === "local-declaration" &&
finding.name === "value"
)
);
});

test("reports function parameter candidates", () => {
const report = analyzeShieldSource(
"local function greet(player) print(player) end"
);

assert.ok(
report.findings.some(
finding =>
finding.category === "function-parameter" &&
finding.name === "player"
)
);
});

test("does not modify the source", () => {
const source = "local x = 1\nprint(x)";
analyzeShieldSource(source);

assert.equal(source, "local x = 1\nprint(x)");
});

test("rejects non-string input", () => {
assert.throws(
() => analyzeShieldSource(null as unknown as string),
/Source must be a string/
);
});
