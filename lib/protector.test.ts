export interface ProtectorResult {
  success: boolean;
  originalLength: number;
  outputLength: number;
  output: string;
  transformations: string[];
  warnings: string[];
}

const MAX_SOURCE_LENGTH = 100_000;
const OPEN_TO_CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSE_TO_OPEN: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

function longBracketLevel(source: string, start: number): number | null {
  if (source[start] !== "[") return null;
  let index = start + 1;
  while (source[index] === "=") index++;
  return source[index] === "[" ? index - start - 1 : null;
}

function longBracketEnd(source: string, start: number, level: number): number {
  const closing = "]" + "=".repeat(level) + "]";
  const end = source.indexOf(closing, start);
  if (end === -1) throw new Error("Unterminated long string or block comment.");
  return end + closing.length;
}

function isIdentifierChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_]/.test(char);
}

/**
 * Conservative lexical checks and cleanup. This is not a complete Luau parser.
 * Horizontal whitespace is collapsed to one space rather than deleted around
 * operators, because deleting it can change tokens (for example, `a - -b`).
 */
function validateAndMinify(source: string): string {
  let output = "";
  let index = 0;
  const delimiters: Array<{ char: string; offset: number }> = [];

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "'" || char === '"') {
      const quote = char;
      const start = index++;
      let closed = false;
      while (index < source.length) {
        if (source[index] === "\\") {
          if (index + 1 >= source.length) throw new Error("Unterminated escape sequence in quoted string.");
          index += 2;
          continue;
        }
        if (source[index] === quote) {
          index++;
          closed = true;
          break;
        }
        if (source[index] === "\n" || source[index] === "\r") {
          throw new Error("Unescaped newline in quoted string.");
        }
        index++;
      }
      if (!closed) throw new Error("Unterminated quoted string.");
      output += source.slice(start, index);
      continue;
    }

    if (char === "[") {
      const level = longBracketLevel(source, index);
      if (level !== null) {
        const end = longBracketEnd(source, index + level + 2, level);
        output += source.slice(index, end);
        index = end;
        continue;
      }
    }

    if (char === "-" && next === "-") {
      const commentStart = index;
      const level = longBracketLevel(source, index + 2);
      if (level !== null) {
        const bodyStart = index + 2 + level + 2;
        index = longBracketEnd(source, bodyStart, level);
        // Preserve line breaks so line-sensitive constructs remain separated.
        output += source.slice(commentStart, index).replace(/[^\r\n]/g, " ");
        continue;
      }
      while (index < source.length && source[index] !== "\n" && source[index] !== "\r") index++;
      output += " ".repeat(index - commentStart);
      continue;
    }

    if (OPEN_TO_CLOSE[char]) {
      delimiters.push({ char, offset: index });
    } else if (CLOSE_TO_OPEN[char]) {
      const top = delimiters.pop();
      if (!top || top.char !== CLOSE_TO_OPEN[char]) {
        throw new Error(`Mismatched closing delimiter '${char}' at character ${index + 1}.`);
      }
    }

    if (char === "\r" || char === "\n") {
      // Normalize CRLF/CR to LF while retaining statement boundaries.
      if (char === "\r" && next === "\n") index++;
      output += "\n";
      index++;
      continue;
    }

    if (/[ \t\f\v]/.test(char)) {
      while (index < source.length && /[ \t\f\v]/.test(source[index])) index++;
      const previous = output[output.length - 1];
      const following = source[index];
      // Keep one separator when needed for token boundaries or operator safety.
      if (previous && previous !== "\n" && following !== undefined && following !== "\n") {
        if (isIdentifierChar(previous) || isIdentifierChar(following) || /[+\-*/%^#=<>~:.]/.test(previous + following)) {
          output += " ";
        }
      }
      continue;
    }

    output += char;
    index++;
  }

  if (delimiters.length) {
    const unclosed = delimiters[delimiters.length - 1];
    throw new Error(`Unclosed delimiter '${unclosed.char}' at character ${unclosed.offset + 1}.`);
  }

  return output.trim();
}

export function protectLuau(source: string): ProtectorResult {
  if (typeof source !== "string") throw new Error("Source must be a string.");
  if (source.trim().length === 0) throw new Error("Source code cannot be empty.");
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new Error(`Source exceeds the ${MAX_SOURCE_LENGTH} character limit.`);
  }

  const output = validateAndMinify(source);
  return {
    success: true,
    originalLength: source.length,
    outputLength: output.length,
    output,
    transformations: [
      "Checked quoted strings and long-bracket strings/comments",
      "Checked matching (), [] and {} delimiters",
      "Removed comments while preserving line breaks",
      "Collapsed horizontal whitespace conservatively to avoid merging tokens"
    ],
    warnings: [
      "Syntax Guard performs lexical checks; it is not a complete Luau parser or type checker.",
      "Identifier renaming, string encoding, VM layers, FFI and runtime anti-tamper are not implemented.",
      "Test the output in the target runtime before using it."
    ]
  };
}
