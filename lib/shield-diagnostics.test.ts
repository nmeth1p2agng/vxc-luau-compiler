import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseShieldSource } from "./shield-diagnostics";

test("returns a unified report for simple source", () => {
const report = diagnoseShieldSource("local value = 1");

assert.equal(report.sourceLength, "local value = 1".length);
assert.ok(report.diagnostics.length > 0);
assert.ok(report.summary.warnings >= 0);
});

test("reports an unterminated string as invalid", () => {
const report = diagnoseShieldSource(
'local value = "unfinished'
);

assert.equal(report.valid, false);
assert.ok(report.summary.errors > 0);
});

test("includes diagnostics from multiple modules", () => {
const report = diagnoseShieldSource(
"local function greet(name) print(name) end"
);

const sources = new Set(
report.diagnostics.map(item => item.source)
);

assert.ok(sources.has("syntax-guard"));
assert.ok(sources.has("lexer-boundaries"));
assert.ok(sources.has("token-integrity"));
assert.ok(sources.has("shield-analysis"));
});

test("summary counts match diagnostic severities", () => {
const report = diagnoseShieldSource("print('hello')");

assert.equal(
report.summary.errors,
report.diagnostics.filter(
item => item.severity === "error"
).length
);

assert.equal(
report.summary.warnings,
report.diagnostics.filter(
item => item.severity === "warning"
).length
);

assert.equal(
report.summary.info,
report.diagnostics.filter(
item => item.severity === "info"
).length
);
});

test("rejects non-string input", () => {
assert.throws(
() => diagnoseShieldSource(null as unknown as string),
/Source must be a string/
);
});
