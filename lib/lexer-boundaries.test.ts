import test from "node:test";
import assert from "node:assert/strict";
import { checkLexerBoundaries } from "./lexer-boundaries";

test("accepts simple Luau source", () => {
const result = checkLexerBoundaries(
"local value = 1\nprint(value)"
);

assert.equal(result.valid, true);
assert.ok(result.tokenCount > 0);
});

test("keeps token offsets within source bounds", () => {
const source = "local text = 'hello'";
const result = checkLexerBoundaries(source);

for (const token of result.tokens) {
assert.ok(token.start >= 0);
assert.ok(token.end <= source.length);
assert.ok(token.end >= token.start);
}
});

test("does not tokenize identifier-like text inside strings", () => {
const result = checkLexerBoundaries(
'local text = "fakeIdentifier"'
);

assert.equal(
result.tokens.some(
token => token.value === "fakeIdentifier"
),
false
);
});

test("reports lexical errors for unterminated strings", () => {
const result = checkLexerBoundaries(
'local text = "unfinished'
);

assert.equal(result.valid, false);
assert.ok(result.errors.length > 0);
});

test("provides a limitation warning", () => {
const result = checkLexerBoundaries(
"print('hello')"
);

assert.ok(
result.warnings.some(
warning => warning.includes("valid Luau")
)
);
});
