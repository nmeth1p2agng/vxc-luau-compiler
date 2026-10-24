import test from "node:test";
import assert from "node:assert/strict";

import { compileLuau } from "./compiler";
import { executeBytecode, runLuau } from "./vm";
import { parseLuau } from "./parser";

test("compile and execute local variables", () => {
  const source = `
    local a = 8
    local b = 3
    return a + b
  `;

  assert.equal(runLuau(source), 11);
});

test("multiplication has higher precedence than addition", () => {
  assert.equal(runLuau("return 2 + 3 * 4"), 14);
});

test("parentheses override precedence", () => {
  assert.equal(runLuau("return (2 + 3) * 4"), 20);
});

test("subtraction works", () => {
  assert.equal(runLuau("return 8 - 3"), 5);
});

test("division works", () => {
  assert.equal(runLuau("return 8 / 2"), 4);
});

test("unknown variables are rejected", () => {
  assert.throws(
    () => compileLuau("return missing"),
    /Unknown variable/,
  );
});

test("division by zero is rejected", () => {
  assert.throws(
    () => runLuau("return 8 / 0"),
    /Division by zero/,
  );
});

test("empty programs are rejected", () => {
  assert.throws(
    () => parseLuau(""),
    /cannot be empty/,
  );
});

test("bytecode without RETURN is rejected by the VM", () => {
  const bytecode = {
    version: 1 as const,
    localCount: 0,
    instructions: [
      { op: "CONST" as const, value: 5 },
    ],
  };

  assert.throws(
    () => executeBytecode(bytecode),
    /without RETURN/,
  );
});

test("instruction limit is enforced", () => {
  assert.throws(
    () => runLuau("return 1", { maxSteps: 1 }),
    /instruction limit exceeded/,
  );
});
