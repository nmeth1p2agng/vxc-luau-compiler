/**
 * VXC Shield Stage 3: lexical identifier analysis foundation.
 * This module intentionally does NOT rename identifiers. Safe renaming needs
 * a scope-aware Luau parser; text replacement is not sufficient.
 */
export type TokenKind = "identifier" | "keyword" | "symbol" | "number" | "string";

export interface LexToken {
  kind: TokenKind;
  value: string;
  start: number;
  end: number;
}

const KEYWORDS = new Set([
  "and", "break", "continue", "do", "else", "elseif", "end", "false",
  "for", "function", "if", "in", "local", "nil", "not", "or", "repeat",
  "return", "then", "true", "type", "typeof", "until", "while"
]);

function isStart(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z_]/.test(ch);
}
function isPart(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z0-9_]/.test(ch);
}
function longBracketLevel(source: string, start: number): number | null {
  if (source[start] !== "[") return null;
  let i = start + 1;
  while (source[i] === "=") i++;
  return source[i] === "[" ? i - start - 1 : null;
}
function consumeLongBracket(source: string, start: number, level: number): number {
  const close = "]" + "=".repeat(level) + "]";
  const found = source.indexOf(close, start);
  if (found < 0) throw new Error("Unterminated long string/comment.");
  return found + close.length;
}

/** Tokenizes identifiers while skipping comments and preserving strings as single tokens. */
export function tokenizeLuau(source: string): LexToken[] {
  if (typeof source !== "string") throw new Error("Source must be a string.");
  const tokens: LexToken[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (/\s/.test(ch)) { i++; continue; }

    if (ch === "-" && next === "-") {
      const level = longBracketLevel(source, i + 2);
      if (level !== null) {
        const openerLength = level + 2;
        i = consumeLongBracket(source, i + 2 + openerLength, level);
      } else {
        i += 2;
        while (i < source.length && source[i] !== "\n" && source[i] !== "\r") i++;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      const start = i++;
      let closed = false;
      while (i < source.length) {
        if (source[i] === "\\") { i += 2; continue; }
        if (source[i] === ch) { i++; closed = true; break; }
        if (source[i] === "\n" || source[i] === "\r") throw new Error("Unescaped newline in quoted string.");
        i++;
      }
      if (!closed) throw new Error("Unterminated quoted string.");
      tokens.push({ kind: "string", value: source.slice(start, i), start, end: i });
      continue;
    }

    if (ch === "[") {
      const level = longBracketLevel(source, i);
      if (level !== null) {
        const start = i;
        i = consumeLongBracket(source, i + level + 2, level);
        tokens.push({ kind: "string", value: source.slice(start, i), start, end: i });
        continue;
      }
    }

    if (isStart(ch)) {
      const start = i++;
      while (isPart(source[i])) i++;
      const value = source.slice(start, i);
      tokens.push({ kind: KEYWORDS.has(value) ? "keyword" : "identifier", value, start, end: i });
      continue;
    }

    if (/[0-9]/.test(ch)) {
      const start = i++;
      while (i < source.length && /[A-Za-z0-9_.]/.test(source[i])) i++;
      tokens.push({ kind: "number", value: source.slice(start, i), start, end: i });
      continue;
    }

    const start = i;
    const three = source.slice(i, i + 3);
    const two = source.slice(i, i + 2);
    if (["...", "..=", "//="].includes(three)) i += 3;
    else if (["..", "==", "~=", "<=", ">=", "//", "+=", "-=", "*=", "/=", "%=", "^=", "->", "::"].includes(two)) i += 2;
    else i++;
    tokens.push({ kind: "symbol", value: source.slice(start, i), start, end: i });
  }
  return tokens;
}

/** Reports identifier tokens only; it does not decide whether they are locals or globals. */
export function listIdentifiers(source: string): string[] {
  return tokenizeLuau(source).filter(token => token.kind === "identifier").map(token => token.value);
}
