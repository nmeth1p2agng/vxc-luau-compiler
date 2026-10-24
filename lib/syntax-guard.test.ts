import test from "node:test";
import assert from "node:assert/strict";
import { checkLuauSource } from "./syntax-guard";

test("accepts a simple non-empty source", () => {
const result = checkLuauSource("local value = 1");

assert.equal(result.valid, true);
assert.ok(result.tokenCount > 0);
});

test("rejects empty source", () => {
const result = checkLuauSource("   \n ");

assert.equal(result.valid, false);
assert.ok(result.errors.some(error => error.includes("empty")));
});

test("detects an unterminated quoted string", () => {
const result = checkLuauSource('local message = "unfinished');

assert.equal(result.valid, false);
assert.ok(result.errors.length > 0);
});

test("rejects null characters", () => {
const result = checkLuauSource("local value = 1\u0000");

assert.equal(result.valid, false);
assert.ok(result.errors.some(error => error.includes("null")));
});

test("warns that lexical checks are not a full parser", () => {
const result = checkLuauSource("print('hello')");

assert.ok(
result.warnings.some(warning => warning.includes("valid Luau"))
);
});
