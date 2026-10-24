/**
 * VXC Shield Stage 8.5.2
 * Conservative reference resolution with basic function scopes.
 *
 * Supports:
 * - Simple local declarations
 * - Local function declarations
 * - Basic anonymous and named function parameters
 * - do/end blocks
 *
 * This is not a complete Luau parser.
 * Do not use this module for automatic renaming.
 */

import { tokenizeLuau, type LexToken } from "./identifier-analysis";

export interface ResolvedDeclaration {
  id: string;
  name: string;
  start: number;
  end: number;
  scopeId: string;
  form: "local" | "local-function" | "function-parameter";
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

function isKeyword(
  token: LexToken | undefined,
  value: string
): boolean {
  return token?.kind === "keyword" && token.value === value;
}

function isSymbol(
  token: LexToken | undefined,
  value: string
): boolean {
  return token?.kind === "symbol" && token.value === value;
}

function findMatchingParen(
  tokens: LexToken[],
  openIndex: number
): number {
  let depth = 0;

  for (let i = openIndex; i < tokens.length; i++) {
    if (isSymbol(tokens[i], "(")) {
      depth++;
    } else if (isSymbol(tokens[i], ")")) {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
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

export function resolveIdentifierReferences(
  source: string
): ReferenceResolutionResult {
  const tokens = tokenizeLuau(source);

  const root: Scope = {
    id: "scope:0",
    parent: null,
    declarations: new Map(),
  };

  const scopes: Scope[] = [root];
  const scopeAtToken: Scope[] = [];
  const declarations: ResolvedDeclaration[] = [];
  const declarationTokenIndexes = new Set<number>();

  let nextScopeId = 1;
  let currentScope = root;

  function createScope(parent: Scope): Scope {
    const scope: Scope = {
      id: `scope:${nextScopeId++}`,
      parent,
      declarations: new Map(),
    };

    scopes.push(scope);
    return scope;
  }

  function addDeclaration(
    tokenIndex: number,
    form: ResolvedDeclaration["form"],
    scope: Scope
  ): void {
    const token = tokens[tokenIndex];

    if (!token || token.kind !== "identifier") {
      return;
    }

    const declaration: ResolvedDeclaration = {
      id: `${token.start}:${token.end}:${form}`,
      name: token.value,
      start: token.start,
      end: token.end,
      scopeId: scope.id,
      form,
    };

    declarations.push(declaration);
    declarationTokenIndexes.add(tokenIndex);
    scope.declarations.set(token.value, declaration);
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    scopeAtToken[i] = currentScope;

    if (isKeyword(token, "end")) {
      if (currentScope.parent) {
        currentScope = currentScope.parent;
      }

      scopeAtToken[i] = currentScope;
      continue;
    }

    if (isKeyword(token, "do")) {
      currentScope = createScope(currentScope);
      scopeAtToken[i] = currentScope;
      continue;
    }

    if (isKeyword(token, "function")) {
      const openParenIndex = tokens.findIndex(
        (candidate, index) =>
          index > i && isSymbol(candidate, "(")
      );

      if (openParenIndex !== -1) {
        const closeParenIndex = findMatchingParen(
          tokens,
          openParenIndex
        );

        if (closeParenIndex !== -1) {
          const functionScope = createScope(currentScope);

          for (
            let parameterIndex = openParenIndex + 1;
            parameterIndex < closeParenIndex;
            parameterIndex++
          ) {
            const parameter = tokens[parameterIndex];

            if (
              parameter.kind === "identifier" &&
              (
                isSymbol(tokens[parameterIndex - 1], "(") ||
                isSymbol(tokens[parameterIndex - 1], ",")
              )
            ) {
              addDeclaration(
                parameterIndex,
                "function-parameter",
                functionScope
              );
            }
          }

          // The function body is entered after its parameter list.
          // The simplified token model does not parse every Luau function form.
          for (
            let bodyIndex = openParenIndex + 1;
            bodyIndex <= closeParenIndex;
            bodyIndex++
          ) {
            scopeAtToken[bodyIndex] = functionScope;
          }
        }
      }

      continue;
    }

    if (isKeyword(token, "local")) {
      const next = tokens[i + 1];

      if (isKeyword(next, "function")) {
        addDeclaration(i + 2, "local-function", currentScope);
        continue;
      }

      if (next?.kind === "identifier") {
        addDeclaration(i + 1, "local", currentScope);

        let j = i + 2;

        while (j < tokens.length && isSymbol(tokens[j], ",")) {
          const candidate = tokens[j + 1];

          if (candidate?.kind !== "identifier") {
            break;
          }

          addDeclaration(j + 1, "local", currentScope);
          j += 2;
        }
      }
    }
  }

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
      status: declaration ? "resolved" : "unresolved",
    });
  }

  return {
    declarations: declarations.sort((a, b) => a.start - b.start),
    references: references.sort((a, b) => a.start - b.start),
    warnings: [
      "Prototype only: this resolver supports a limited subset of Luau.",
      "Function-body scope tracking and declaration timing are incomplete.",
      "Loop variables, repeat/until, method syntax, and complex type annotations are not fully modeled.",
      "Forward references may be resolved incorrectly.",
      "Do not use this result for automatic identifier renaming.",
    ],
  };
}
