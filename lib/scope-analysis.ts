/**
 * VXC Shield Stage 4: conservative declaration inventory.
 * This does NOT perform renaming and is not a full Luau parser.
 */
import { tokenizeLuau, type LexToken } from "./identifier-analysis";

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

function nextSignificant(tokens: LexToken[], index: number): LexToken | undefined {
  return tokens[index];
}

/**
 * Inventories only obvious `local name` and `local function name` declarations.
 * It intentionally does not claim to resolve references, shadowing, or scopes.
 */
export function analyzeLocalDeclarations(source: string): ScopeAnalysisResult {
  const tokens = tokenizeLuau(source);
  const declarations: LocalDeclaration[] = [];
  const warnings = [
    "Prototype only: references, shadowing, block scopes, and function parameters are not resolved.",
    "Do not use this result to rename identifiers automatically."
  ];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind !== "keyword" || token.value !== "local") continue;

    const next = nextSignificant(tokens, i + 1);
    if (!next) continue;

    if (next.kind === "keyword" && next.value === "function") {
      const name = tokens[i + 2];
      if (name?.kind === "identifier") {
        declarations.push({
          name: name.value,
          declarationStart: name.start,
          declarationEnd: name.end,
          form: "local-function",
          confidence: "high",
          note: "Obvious local function declaration; scope and references are not resolved."
        });
      }
      continue;
    }

    if (next.kind === "identifier") {
      declarations.push({
        name: next.value,
        declarationStart: next.start,
        declarationEnd: next.end,
        form: "local",
        confidence: "high",
        note: "First identifier after local; additional names and type annotations are not mapped."
      });
    }
  }

  return { declarations, warnings };
}
