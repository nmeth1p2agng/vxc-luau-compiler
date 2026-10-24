/**
 * VXC Shield Stage 8.4.1: unified conservative binding inventory.
 *
 * Analysis-only prototype.
 * Does not resolve lexical scopes or identifier references.
 * Do not use for automatic identifier renaming.
 */

import {
  tokenizeLuau,
  type LexToken
} from "./identifier-analysis";

import {
  analyzeLocalDeclarations
} from "./scope-analysis";

export type BindingForm =
  | "local"
  | "local-function"
  | "function-parameter"
  | "numeric-for"
  | "generic-for";

export interface BindingDeclaration {
  id: string;
  name: string;
  start: number;
  end: number;
  form: BindingForm;
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

function createBinding(
  token: LexToken,
  form: BindingForm
): BindingDeclaration {
  return {
    id: `${token.start}:${token.end}:${form}`,
    name: token.value,
    start: token.start,
    end: token.end,
    form,
    confidence: "low",
    note:
      "Declaration candidate only; lexical scope and reference resolution are not implemented."
  };
}

function isIdentifier(
  token: LexToken | undefined
): token is LexToken {
  return token?.kind === "identifier";
}

function addUnique(
  bindings: BindingDeclaration[],
  binding: BindingDeclaration
): void {
  if (!bindings.some(existing => existing.id === binding.id)) {
    bindings.push(binding);
  }
}

/**
 * Inventories obvious local declarations, function parameters,
 * and simple loop variables.
 *
 * This is not a complete Luau parser.
 */
export function analyzeBindings(
  source: string
): BindingAnalysisResult {
  const tokens = tokenizeLuau(source);
  const bindings: BindingDeclaration[] = [];

  const warnings = [
    "Prototype only: lexical scopes, shadowing, and references are not resolved.",
    "Complex Luau syntax, type annotations, and multiline constructs may be missed.",
    "Binding IDs identify declaration candidates by source position and form.",
    "Do not use this inventory for automatic identifier renaming."
  ];

  // Include local declarations recognized by scope-analysis.
  const localResult = analyzeLocalDeclarations(source);

  for (const declaration of localResult.declarations) {
    const token = tokens.find(
      item =>
        item.start === declaration.declarationStart &&
        item.end === declaration.declarationEnd &&
        item.value === declaration.name
    );

    if (!token) {
      continue;
    }

    addUnique(
      bindings,
      createBinding(token, declaration.form)
    );
  }

  // Detect function parameter candidates.
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

      if (token.value === "...") {
        expectName = false;
        continue;
      }

      if (expectName && isIdentifier(token)) {
        const next = tokens[j + 1];

        if (
          next &&
          [",", ")", ":"].includes(next.value)
        ) {
          addUnique(
            bindings,
            createBinding(token, "function-parameter")
          );

          expectName = false;
          continue;
        }
      }

      if (token.value === ",") {
        expectName = true;
      }
    }
  }

  // Detect numeric and generic for-loop binding candidates.
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

    const form: BindingForm =
      separatorToken.value === "="
        ? "numeric-for"
        : "generic-for";

    for (let j = i + 1; j < separator; j++) {
      const token = tokens[j];

      if (!isIdentifier(token)) {
        continue;
      }

      addUnique(bindings, createBinding(token, form));

      // Numeric for-loops have one loop variable.
      if (form === "numeric-for") {
        break;
      }
    }
  }

  bindings.sort((a, b) => a.start - b.start);

  return {
    bindings,
    warnings
  };
}
