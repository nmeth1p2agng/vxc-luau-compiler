import test from "node:test";
import assert from "node:assert/strict";
import { listIdentifiers, tokenizeLuau } from "./identifier-analysis";

test("identifiers inside strings and comments are ignored", () => {
  const source = 'local hello = "hiddenName" -- commentName\nprint(hello)';
  assert.deepEqual(listIdentifiers(source), ["hello", "print", "hello"]);
});

test("long bracket strings are single string tokens", () => {
  const tokens = tokenizeLuau('local x = [=[fakeIdentifier -- still string]=]');
  assert.equal(tokens.some(token => token.value === "fakeIdentifier"), false);
  assert.equal(tokens.find(token => token.kind === "string")?.value, "[=[fakeIdentifier -- still string]=]");
});

test("table property names are visible as tokens but not classified as locals", () => {
  const tokens = tokenizeLuau("local value = object.value; object.value = value");
  assert.equal(tokens.filter(token => token.kind === "identifier" && token.value === "value").length, 3);
});

test("unterminated quoted strings fail closed", () => {
  assert.throws(() => tokenizeLuau('local x = "oops'), /Unterminated quoted string/);
});
