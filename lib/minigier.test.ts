import test from "node:test";
import assert from "node:assert/strict";
import { minifyLuau } from "./safe-minifier";

test("removes ordinary comments", () => {
const result = minifyLuau(
"local value = 1 -- this is a comment\nprint(value)"
);

assert.ok(!result.code.includes("this is a comment"));
assert.ok(result.code.includes("print"));
});

test("preserves quoted string contents", () => {
const result = minifyLuau(
'local message = "hello   world"'
);

assert.ok(result.code.includes('"hello   world"'));
});

test("preserves long-bracket string contents", () => {
const result = minifyLuau(
"local message = [=[hello\n  world]=]"
);

assert.ok(result.code.includes("[=[hello\n  world]=]"));
});

test("keeps identifiers separated", () => {
const result = minifyLuau(
"local first = 1\nlocal second = 2"
);

assert.ok(result.code.includes("local first"));
assert.ok(result.code.includes("local second"));
});

test("does not silently accept an unterminated string", () => {
assert.throws(
() => minifyLuau('local message = "unfinished'),
/Unterminated quoted string/
);
});

test("returns size information", () => {
const source = "local value = 1 -- comment";
const result = minifyLuau(source);

assert.equal(result.originalLength, source.length);
assert.equal(result.outputLength, result.code.length);
assert.equal(result.changed, result.code !== source);
});

test("includes a warning about parser limitations", () => {
const result = minifyLuau("print('hello')");

assert.ok(
result.warnings.some(
warning => warning.includes("not a full Luau parser")
)
);
});
