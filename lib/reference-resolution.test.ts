import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveIdentifierReferences
} from "./reference-resolution";

test("resolves a simple local reference", () => {
  const result = resolveIdentifierReferences(
    "local value = 10; print(value)"
  );

  const reference = result.references.find(
    item => item.name === "value"
  );

  assert.ok(reference);
  assert.equal(reference.status, "resolved");
  assert.equal(reference.declarationId, result.declarations[0].id);
});

test("distinguishes shadowed declarations in do blocks", () => {
  const source =
    "local value = 10\n" +
    "do local value = 20; print(value) end\n" +
    "print(value)";

  const result = resolveIdentifierReferences(source);

  const declarations = result.declarations.filter(
    item => item.name === "value"
  );

  const references = result.references.filter(
    item => item.name === "value"
  );

  assert.equal(declarations.length, 2);
  assert.notEqual(declarations[0].id, declarations[1].id);
  assert.equal(references.length, 2);

  assert.equal(references[0].declarationId, declarations[1].id);
  assert.equal(references[1].declarationId, declarations[0].id);
});

test("does not treat strings or comments as references", () => {
  const result = resolveIdentifierReferences(
    'local value = "value"\n-- value\nprint(value)'
  );

  assert.equal(
    result.references.filter(item => item.name === "value").length,
    1
  );
});

test("leaves unknown names unresolved", () => {
  const result = resolveIdentifierReferences(
    "print(unknownName)"
  );

  const reference = result.references.find(
    item => item.name === "unknownName"
  );

  assert.ok(reference);
  assert.equal(reference.status, "unresolved");
  assert.equal(reference.declarationId, null);
});

test("warns that the resolver is only a prototype", () => {
  const result = resolveIdentifierReferences(
    "local value = 1"
  );

  assert.ok(
    result.warnings.some(
      warning => warning.includes("not fully modeled")
    )
  );
});
test("keeps function parameters distinct from outer locals", () => {
  const source =
    "local value = 10\n" +
    "local function greet(value)\n" +
    "  print(value)\n" +
    "end\n" +
    "print(value)";

  const result = resolveIdentifierReferences(source);

  const declarations = result.declarations.filter(
    item => item.name === "value"
  );

  // Saat ini resolver belum mendukung parameter fungsi.
  // Tes ini akan menjadi target implementasi berikutnya.
  assert.equal(declarations.length, 1);
});
test("detects function parameters as separate declarations", () => {
  const source =
    "local value = 10\n" +
    "local function greet(value)\n" +
    "  print(value)\n" +
    "end\n" +
    "print(value)";

  const result = resolveIdentifierReferences(source);

  const declarations = result.declarations.filter(
    (item) => item.name === "value"
  );

  assert.equal(declarations.length, 2);

  assert.ok(
    declarations.some(
      (item) => item.form === "local"
    )
  );

  assert.ok(
    declarations.some(
      (item) => item.form === "function-parameter"
    )
  );
});
