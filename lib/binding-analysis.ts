/**
 * VXC Shield Stage 8.1: conservative function-parameter
 * and loop-binding inventory with stable declaration IDs.
 *
 * Prototype only. Do not use for automatic renaming.
 */

import { tokenizeLuau, type LexToken } from "./identifier-analysis";

export interface BindingDeclaration {
  id: string;
  name: string;
  start: number;
  end: number;
  form:
    | "function-parameter"
    | "numeric-for"
    | "generic-for";
  confidence: "low";
  note: string;
}

export interface BindingAnalysisResult {
  bindings: BindingDeclaration[];
  warnings: string[];
}

function matchingClose(
  tokens: LexToken[],
  openIndex: number,
  open: string,
  close: string
): number {
  let depth = 0;

  for (let i = openIndex; i < tokens.length; i++) {
    if (tokens[i].value === open) {
      depth++;
    } else if (tokens[i].value === close) {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Detects common function parameters and simple loop variables.
 *
 * This is not a complete Luau parser.
 * Scope resolution, shadowing, and reference resolution
 * are not implemented.
 */
export function analyzeBindings(
  source: string
): BindingAnalysisResult {
  const tokens = tokenizeLuau(source);
  const bindings: BindingDeclaration[] = [];

  const warnings = [
    "Prototype only: binding scopes and shadowing are not resolved.",
    "Function type annotations and complex Luau syntax may be missed.",
    "Binding IDs identify declarations by source position and form only.",
    "Do not use this inventory for automatic identifier renaming."
  ];

  // Detect ordinary and anonymous function parameter lists.
  for (let i = 0; i < tokens.length; i++) {
    if (
      tokens[i].kind !== "keyword" ||
      tokens[i].value !== "function"
    ) {
      continue;
    }

    let openIndex = i + 1;

    while (
      openIndex < tokens.length &&
      tokens[openIndex].value !== "(" &&
      tokens[openIndex].value !== "end" &&
      tokens[openIndex].value !== "="
    ) {
      openIndex++;
    }

    if (tokens[openIndex]?.value !== "(") {
      continue;
    }

    const closeIndex = matchingClose(
      tokens,
      openIndex,
      "(",
      ")"
    );

    if (closeIndex < 0) {
      warnings.push(
        "Unclosed function parameter list detected."
      );
      continue;
    }

    let expectName = true;

    for (let j = openIndex + 1; j < closeIndex; j++) {
      const token = tokens[j];

      // Variadic parameters do not have an ordinary identifier
      // declaration in this inventory.
      if (token.value === "...") {
        expectName = false;
        continue;
      }

      if (
        expectName &&
        token.kind === "identifier"
      ) {
        const next = tokens[j + 1];

        if (
          next &&
          [",", ")", ":"].includes(next.value)
        ) {
          bindings.push({
            id: `${token.start}:${token.end}:function-parameter`,
            name: token.value,
            start: token.start,
            end: token.end,
            form: "function-parameter",
            confidence: "low",
            note:
              "Parameter candidate; type syntax and scope are not fully resolved."
          });

          expectName = false;
          continue;
        }
      }

      if (token.value === ",") {
        expectName = true;
      }
    }
  }

  // Detect simple numeric and generic for-loop variables.
  for (let i = 0; i < tokens.length; i++) {
    if (
      tokens[i].kind !== "keyword" ||
      tokens[i].value !== "for"
    ) {
      continue;
    }

    let separator = i + 1;

    while (
      separator < tokens.length &&
      tokens[separator].value !== "=" &&
      tokens[separator].value !== "in" &&
      tokens[separator].value !== "do"
    ) {
      separator++;
    }

    const separatorToken = tokens[separator];

    if (
      !separatorToken ||
      (
        separatorToken.value !== "=" &&
        separatorToken.value !== "in"
      )
    ) {
      continue;
    }

    const form =
      separatorToken.value === "="
        ? "numeric-for"
        : "generic-for";

    for (let j = i + 1; j < separator; j++) {
      const token = tokens[j];

      if (token.kind !== "identifier") {
        continue;
      }

      bindings.push({
        id: `${token.start}:${token.end}:${form}`,
        name: token.value,
        start: token.start,
        end: token.end,
        form,
        confidence: "low",
        note:
          "Loop binding candidate; scope and complex syntax are not fully resolved."
      });

      if (form === "numeric-for") {
        break;
      }
    }
  }

  // Remove duplicate detections using declaration IDs.
  const unique = new Map<string, BindingDeclaration>();

  for (const binding of bindings) {
    if (!unique.has(binding.id)) {
      unique.set(binding.id, binding);
    }
  }

  return {
    bindings: [...unique.values()].sort(
      (a, b) => a.start - b.start
    ),
    warnings
  };
}
