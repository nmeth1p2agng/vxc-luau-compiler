import test from "node:test";
import assert from "node:assert/strict";
import { analyzeBindings } from "./binding-analysis";

test("finds ordinary function parameters", () => {
const result = analyzeBindings(
"local function greet(name, count) print(name, count) end"
);

const found = result.bindings
.filter(item => item.form === "function-parameter")
.map(item => item.name);

assert.deepEqual(found, ["name", "count"]);
});

test("finds anonymous function parameters", () => {
const result = analyzeBindings(
"local callback = function(value) return value end"
);

assert.ok(
result.bindings.some(
item =>
item.name === "value" &&
item.form === "function-parameter"
)
);
});

test("finds numeric and generic for-loop bindings", () => {
const result = analyzeBindings(
"for i = 1, 3 do print(i) end\n" +
"for key, value in pairs(t) do print(key, value) end"
);

assert.ok(
result.bindings.some(
item =>
item.name === "i" &&
item.form === "numeric-for"
)
);

assert.ok(
result.bindings.some(
item =>
item.name === "key" &&
item.form === "generic-for"
)
);

assert.ok(
result.bindings.some(
item =>
item.name === "value" &&
item.form === "generic-for"
)
);
});

test("warns that binding analysis is a prototype", () => {
const result = analyzeBindings(
"function greet(name) return name end"
);

assert.ok(
result.warnings.some(
warning => warning.includes("not resolved")
)
);
});
test("preserves distinct bindings during deduplication", () => {
  const result = analyzeBindings(
    "function greet(name, count) " +
    "for i = 1, 3 do print(i) end " +
    "for key, value in pairs({}) do print(key, value) end " +
    "end"
  );

  const positions = result.bindings.map(
    item => `${item.start}:${item.end}:${item.form}`
  );

  assert.equal(
    positions.length,
    new Set(positions).size
  );

  assert.ok(
    result.bindings.some(
      item =>
        item.name === "name" &&
        item.form === "function-parameter"
    )
  );

  assert.ok(
    result.bindings.some(
      item =>
        item.name === "i" &&
        item.form === "numeric-for"
    )
  );

  assert.ok(
    result.bindings.some(
      item =>
        item.name === "key" &&
        item.form === "generic-for"
    )
  );
});
