/**
 * VXC Shield Stage 8.5.1: conservative reference resolution.
 *
 * Supports a limited subset of Luau:
 * - simple `local name = ...` declarations
 * - `local function name(...)` declarations
 * - `do ... end` lexical blocks
 *
 * This is not a complete Luau parser.
 * Do not use this module for automatic renaming.
 */

import {
  tokenizeLuau,
  type LexToken
} from "./identifier-analysis";

export interface ResolvedDeclaration {
  id: string;
  name: string;
  start: number;
  end: number;
  scopeId: string;
  form: "local" | "local-function";
}

export interface ResolvedReference {
  name: string;
  start: number;
  end: number;
  declarationId: string | null;
  scopeId: string;
  status: "resolved" | "unresolved";
}

export interface ReferenceResolutionResult {
  declarations: ResolvedDeclaration[];
  references: ResolvedReference[];
  warnings: string[];
}

interface Scope {
  id: string;
  parent: Scope | null;
  declarations: Map<string, ResolvedDeclaration>;
}

function isKeyword(token: LexToken | undefined, value: string): boolean {
  return token?.kind === "keyword" && token.value === value;
}

function isSymbol(token: LexToken | undefined, value: string): boolean {
  return token?.kind === "symbol" && token.value === value;
}

function resolveName(
  scope: Scope,
  name: string
): ResolvedDeclaration | null {
  let current: Scope | null = scope;

  while (current) {
    const declaration = current.declarations.get(name);

    if (declaration) {
      return declaration;
    }

    current = current.parent;
  }

  return null;
}

/**
 * Resolves a deliberately small subset of Luau.
 *
 * Unsupported constructs may produce unresolved or incorrectly classified
 * results. This output is for diagnostics and tests only.
 */
export function resolveIdentifierReferences(
  source: string
): ReferenceResolutionResult {
  const tokens = tokenizeLuau(source);
  const root: Scope = {
    id: "scope:0",
    parent: null,
    declarations: new Map()
  };

  const scopes: Scope[] = [root];
  const scopeAtToken: Scope[] = [];
  const declarations: ResolvedDeclaration[] = [];
  const declarationTokenIndexes = new Set<number>();

  let nextScopeId = 1;
  let currentScope = root;

  // First pass: establish simple block scopes and declarations.
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    scopeAtToken[i] = currentScope;

    if (isKeyword(token, "do")) {
      const child: Scope = {
        id: `scope:${nextScopeId++}`,
        parent: currentScope,
        declarations: new Map()
      };

      scopes.push(child);
      currentScope = child;
      scopeAtToken[i] = currentScope;
      continue;
    }

    if (isKeyword(token, "end")) {
      if (currentScope.parent) {
        currentScope = currentScope.parent;
      }

      scopeAtToken[i] = currentScope;
      continue;
    }

    if (!isKeyword(token, "local")) {
      continue;
    }

    const next = tokens[i + 1];

    let nameToken: LexToken | undefined;
    let form: ResolvedDeclaration["form"] = "local";
    let nameIndex = i + 1;

    if (isKeyword(next, "function")) {
      nameToken = tokens[i + 2];
      nameIndex = i + 2;
      form = "local-function";
    } else if (next?.kind === "identifier") {
      nameToken = next;
    }

    if (nameToken?.kind !== "identifier") {
      continue;
    }

    const declaration: ResolvedDeclaration = {
      id: `${nameToken.start}:${nameToken.end}:${form}`,
      name: nameToken.value,
      start: nameToken.start,
      end: nameToken.end,
      scopeId: currentScope.id,
      form
    };

    currentScope.declarations.set(declaration.name, declaration);
    declarations.push(declaration);
    declarationTokenIndexes.add(nameIndex);
  }

  // Second pass: associate each identifier with the nearest visible
  // declaration in the recorded scope chain.
  const references: ResolvedReference[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.kind !== "identifier") {
      continue;
    }

    if (declarationTokenIndexes.has(i)) {
      continue;
    }

    const scope = scopeAtToken[i] ?? root;
    const declaration = resolveName(scope, token.value);

    references.push({
      name: token.value,
      start: token.start,
      end: token.end,
      declarationId: declaration?.id ?? null,
      scopeId: scope.id,
      status: declaration ? "resolved" : "unresolved"
    });
  }

  return {
    declarations,
    references,
    warnings: [
      "Prototype only: this resolver supports only simple local declarations and do blocks.",
      "Function scopes, parameters, loops, repeat/until, and complex Luau syntax are not fully modeled.",
      "Forward references and declaration timing are not fully modeled.",
      "Do not use this result for automatic identifier renaming."
    ]
  };
}
