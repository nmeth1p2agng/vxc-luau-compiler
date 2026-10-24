export interface ProtectorResult {
  success: boolean;
  originalLength: number;
  outputLength: number;
  output: string;
  transformations: string[];
  warnings: string[];
}

const MAX_SOURCE_LENGTH = 100_000;

function longBracketLevel(
  source: string,
  start: number
): number | null {
  if (source[start] !== "[") {
    return null;
  }

  let index = start + 1;

  while (source[index] === "=") {
    index++;
  }

  return source[index] === "["
    ? index - start - 1
    : null;
}

function longBracketEnd(
  source: string,
  start: number,
  level: number
): number {
  const closing = "]" + "=".repeat(level) + "]";
  const end = source.indexOf(closing, start);

  if (end === -1) {
    throw new Error("Unterminated long string or block comment.");
  }

  return end + closing.length;
}

function isIdentifierChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_]/.test(char);
}

function minifyLuau(source: string): string {
  let output = "";
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    // Preserve quoted strings and their escape sequences.
    if (char === '"' || char === "'") {
      const quote = char;
      const start = index++;

      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }

        if (source[index] === quote) {
          index++;
          break;
        }

        index++;
      }

      if (source[index - 1] !== quote) {
        throw new Error("Unterminated quoted string.");
      }

      output += source.slice(start, index);
      continue;
    }

    // Preserve Luau long-bracket strings: [[...]], [=[...]=], etc.
    if (char === "[") {
      const level = longBracketLevel(source, index);

      if (level !== null) {
        const end = longBracketEnd(source, index + level + 2, level);
        output += source.slice(index, end);
        index = end;
        continue;
      }
    }

    // Remove comments, but keep their line breaks.
    if (char === "-" && next === "-") {
      const commentStart = index;
      const level = longBracketLevel(source, index + 2);

      if (level !== null) {
        const bodyStart = index + 2 + level + 2;
        index = longBracketEnd(source, bodyStart, level);

        const comment = source.slice(commentStart, index);
        output += comment.replace(/[^\r\n]/g, " ");
        continue;
      }

      while (
        index < source.length &&
        source[index] !== "\n" &&
        source[index] !== "\r"
      ) {
        index++;
      }

      output += " ".repeat(index - commentStart);
      continue;
    }

    // Compact horizontal whitespace without joining separate lines.
    if (char === " " || char === "\t" || char === "\f" || char === "\v") {
      const previous = output[output.length - 1];

      while (
        index < source.length &&
        /[ \t\f\v]/.test(source[index])
      ) {
        index++;
      }

      const following = source[index];

      // Keep a separator when removing whitespace would merge tokens.
      if (
        isIdentifierChar(previous) &&
        isIdentifierChar(following)
      ) {
        output += " ";
      }

      continue;
    }

    output += char;
    index++;
  }

  return output.trim();
}

export function protectLuau(source: string): ProtectorResult {
  if (typeof source !== "string") {
    throw new Error("Source must be a string.");
  }

  if (source.trim().length === 0) {
    throw new Error("Source code cannot be empty.");
  }

  if (source.length > MAX_SOURCE_LENGTH) {
    throw new Error(
      `Source exceeds the ${MAX_SOURCE_LENGTH} character limit.`
    );
  }

  const output = minifyLuau(source);

  return {
    success: true,
    originalLength: source.length,
    outputLength: output.length,
    output,
    transformations: [
      "Removed comments",
      "Compacted horizontal whitespace",
      "Preserved quoted and long-bracket strings",
      "Preserved line breaks"
    ],
    warnings: [
      "This is basic source cleanup, not strong obfuscation.",
      "Variable names and program logic are not hidden.",
      "Test the output in Roblox Studio before using it in a live game."
    ]
  };
}
