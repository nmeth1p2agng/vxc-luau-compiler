/**

* VXC Shield Stage 11
* Lexer boundary checks for Luau source.
* 
* Uses the existing Stage 3 tokenizer.
* Does not modify or rename source identifiers.
  */

import {
tokenizeLuau,
type LexToken
} from "./identifier-analysis";

export interface LexerBoundaryResult {
valid: boolean;
tokenCount: number;
tokens: LexToken[];
errors: string[];
warnings: string[];
}

export function checkLexerBoundaries(
source: string
): LexerBoundaryResult {
if (typeof source !== "string") {
return {
valid: false,
tokenCount: 0,
tokens: [],
errors: ["Source must be a string."],
warnings: []
};
}

const errors: string[] = [];
const warnings: string[] = [];
let tokens: LexToken[] = [];

try {
tokens = tokenizeLuau(source);
} catch (error) {
errors.push(
error instanceof Error
? error.message
: "Lexer failed to process source."
);
}

for (let i = 1; i < tokens.length; i++) {
const previous = tokens[i - 1];
const current = tokens[i];

if (current.start < previous.end) {
  errors.push(
    `Overlapping tokens at offsets ${previous.start} and ${current.start}.`
  );
}

if (current.start < 0 || current.end > source.length) {
  errors.push(
    `Token offsets are outside the source at ${current.start}.`
  );
}

if (current.start === previous.start) {
  errors.push(
    `Duplicate token start offset at ${current.start}.`
  );
}

}

if (source.includes("\u0000")) {
warnings.push("Source contains a null character.");
}

warnings.push(
"Boundary checks do not prove that the source is valid Luau."
);

return {
valid: errors.length === 0,
tokenCount: tokens.length,
tokens,
errors,
warnings
};
}
