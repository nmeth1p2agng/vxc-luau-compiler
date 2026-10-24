/**

* VXC Shield Stage 9
* Conservative Luau source minifier.
* 
* Preserves quoted and long-bracket strings.
* This is not a complete Luau parser.
  */

import { tokenizeLuau } from "./identifier-analysis";

export interface MinifyResult {
code: string;
originalLength: number;
outputLength: number;
changed: boolean;
warnings: string[];
}

const WORD_TOKEN = /^[A-Za-z0-9_]$/;

function needsSeparator(
previous: string,
current: string
): boolean {
if (!previous || !current) return false;

const last = previous[previous.length - 1];
const first = current[0];

// Avoid merging identifiers and numeric literals.
if (WORD_TOKEN.test(last) && WORD_TOKEN.test(first)) {
return true;
}

// Preserve operators whose concatenation changes tokenization.
const combined = last + first;
const dangerousPairs = new Set([
"--", "==", "~=", "<=", ">=", "..",
"//", "+=", "-=", "*=", "/=", "%=",
"^=", "::"
]);

return dangerousPairs.has(combined);
}

/**

* Removes comments and unnecessary whitespace using token positions.
* Newlines are retained when needed to avoid merging tokens.
  */
  export function minifyLuau(source: string): MinifyResult {
  if (typeof source !== "string") {
  throw new Error("Source must be a string.");
  }

const tokens = tokenizeLuau(source);
let output = "";
let previousToken = "";
let previousEnd = 0;

for (const token of tokens) {
const gap = source.slice(previousEnd, token.start);
const hasNewline = /[\r\n]/.test(gap);

if (output.length > 0) {
  if (needsSeparator(previousToken, token.value)) {
    output += " ";
  } else if (hasNewline) {
    // Newlines can be meaningful for readability and line-sensitive
    // constructs; conservatively preserve one line break.
    output += "\n";
  } else if (/\s/.test(gap)) {
    output += " ";
  }
}

output += token.value;
previousToken = token.value;
previousEnd = token.end;

}

const code = output.trim();

return {
code,
originalLength: source.length,
outputLength: code.length,
changed: code !== source,
warnings: [
"Prototype minifier: not a full Luau parser.",
"Review output carefully before using complex Luau syntax."
]
};
  }
