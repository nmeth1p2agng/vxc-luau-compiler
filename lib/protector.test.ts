import test from "node:test";
import assert from "node:assert/strict";
import { protectLuau } from "./protector";

test("removes line comments but preserves line breaks", () => {
  const result = protectLuau("local x = 1 -- comment\nreturn x");
  assert.match(result.output, /local x = 1/);
  assert.match(result.output, /\nreturn x/);
  assert.doesNotMatch(result.output, /comment/);
});

test("preserves quoted strings and long-bracket strings", () => {
  const source = 'local a = "-- keep"\nlocal b = [=[hello -- keep]=]\nreturn a';
  const result = protectLuau(source);
  assert.match(result.output, /"-- keep"/);
  assert.match(result.output, /\[=\[hello -- keep\]=\]/);
});

test("rejects unterminated quoted strings", () => {
  assert.throws(() => protectLuau('print("oops)'), /Unterminated quoted string/);
});

test("rejects unterminated long-bracket strings", () => {
  assert.throws(() => protectLuau("local x = [[oops"), /Unterminated long string/);
});

test("rejects mismatched delimiters", () => {
  assert.throws(() => protectLuau("local x = (1 + 2]"), /Mismatched closing delimiter/);
});

test("rejects unclosed delimiters", () => {
  assert.throws(() => protectLuau("print({1, 2"), /Unclosed delimiter/);
});

test("rejects empty source", () => {
  assert.throws(() => protectLuau("  \n "), /cannot be empty/);
});

test("does not merge minus operators into a comment", () => {
  const result = protectLuau("local value = a - -b");
  assert.match(result.output, /a - -b/);
});

test("preserves token separation around equals and comparison operators", () => {
  const result = protectLuau("local x = a = = b");
  assert.match(result.output, /a = = b/);
});
