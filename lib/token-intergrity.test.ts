import test from "node:test";
import assert from "node:assert/strict";
import { checkTokenIntegrity } from "./token-integrity";

test("checks ordinary quoted strings", () => {
const result = checkTokenIntegrity(
'local message = "hello world"'
);

assert.equal(result.valid, true);
assert.equal(result.stringCount, 1);
});

test("checks long-bracket strings", () => {
const result = checkTokenIntegrity(
"local message = [=[hello\nworld]=]"
);

assert.equal(result.valid, true);
assert.equal(result.stringCount, 1);
});

test("rejects unterminated strings", () => {
const result = checkTokenIntegrity(
'local message = "unfinished'
);

assert.equal(result.valid, false);
assert.ok(result.errors.length > 0);
});

test("returns token counts", () => {
const result = checkTokenIntegrity(
"local value = 123"
);

assert.ok(result.tokenCount > 0);
assert.equal(result.stringCount, 0);
});

test("warns that this is not a full syntax validator", () => {
const result = checkTokenIntegrity(
"print('hello')"
);

assert.ok(
result.warnings.some(
warning => warning.includes("valid Luau syntax")
)
);
});
