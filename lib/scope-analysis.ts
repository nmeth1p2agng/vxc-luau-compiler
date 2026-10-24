/**
 * VXC Shield Stage 8.3: conservative local declaration inventory.
 *
 * Analysis-only. This is not a complete Luau parser.
 * It does not resolve scopes, references, or shadowing.
 * Do not use this inventory for automatic renaming.
 */

import {
  tokenizeLuau,
  type LexToken
} from "./identifier-analysis";

export interface LocalDeclaration {
  name: string;
  declarationStart: number;
  declarationEnd: number;
  form: "local" | "local-function";
  confidence: "high";
  note: string;
}

export interface ScopeAnalysisResult {
  declarations: LocalDeclaration[];
  warnings: string[];
}

function isSymbol(
  token: LexToken | undefined,
  value: string
): boolean {
  return token?.value === value;
}

function makeDeclaration(
  token: LexToken,
  form: LocalDeclaration["form"]
): LocalDeclaration {
  return {
    name: token.value,
    declarationStart: token.start,
    declarationEnd: token.end,
    form,
    confidence: "high",
    note:
      form === "local-function"
        ? "Local function declaration candidate; scope and references are not resolved."
        : "Local declaration candidate; scope and references are not resolved."
  };
}

/**
 * Recognizes common declaration forms:
 *
 *   local value = 1
 *   local first, second = 1, 2
 *   local function calculate() end
 *
 * Type annotations and complex Luau syntax are intentionally
 * handled conservatively rather than guessed.
 */
export function analyzeLocalDeclarations(
  source: string
): ScopeAnalysisResult {
  const tokens = tokenizeLuau(source);
  const declarations: LocalDeclaration[] = [];

  const warnings = [
    "Prototype only: lexical scopes, references, and shadowing are not resolved.",
    "Complex Luau type annotations and destructuring-like syntax are not fully supported.",
    "Do not use this result to rename identifiers automatically."
  ];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (
      token.kind !== "keyword" ||
      token.value !== "local"
    ) {
      continue;
    }

    const next = tokens[i + 1];

    if (!next) {
      continue;
    }

    // local function name(...)
    if (
      next.kind === "keyword" &&
      next.value === "function"
    ) {
      const name = tokens[i + 2];

      if (name?.kind === "identifier") {
        declarations.push(
          makeDeclaration(name, "local-function")
        );
      }

      continue;
    }

    // local first, second, third = ...
    // Only collect identifiers in the straightforward comma-separated
    // name list before "=". Stop conservatively at unexpected syntax.
    if (next.kind !== "identifier") {
      continue;
    }

    declarations.push(makeDeclaration(next, "local"));

    let j = i + 2;

    while (j < tokens.length) {
      const current = tokens[j];

      if (isSymbol(current, "=")) {
        break;
      }

      if (isSymbol(current, ",")) {
        const candidate = tokens[j + 1];

        if (candidate?.kind !== "identifier") {
          break;
        }

        declarations.push(makeDeclaration(candidate, "local"));
        j += 2;
        continue;
      }

      // Type annotations and unexpected tokens are outside
      // this conservative declaration-list recognizer.
      break;
    }
  }

  // Deduplicate declarations by source position and declaration form.
  const unique = new Map<string, LocalDeclaration>();

  for (const declaration of declarations) {
    const key =
      `${declaration.declarationStart}:` +
      `${declaration.declarationEnd}:` +
      declaration.form;

    if (!unique.has(key)) {
      unique.set(key, declaration);
    }
  }

  return {
    declarations: [...unique.values()].sort(
      (a, b) => a.declarationStart - b.declarationStart
    ),
    warnings
  };
}
