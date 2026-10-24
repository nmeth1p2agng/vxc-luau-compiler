/**

* VXC Shield Stage 8
* Basic lexical safety checks for Luau source.
* 
* This is not a complete Luau parser.
  */

import { tokenizeLuau } from "./identifier-analysis";

export interface SyntaxGuardResult {
valid: boolean;
errors: string[];
warnings: string[];
tokenCount: number;
}

export function checkLuauSource(
source: string
): SyntaxGuardResult {
if (typeof source !== "string") {
return {
valid: false,
errors: ["Source must be a string."],
warnings: [],
tokenCount: 0
};
}

const errors: string[] = [];
const warnings: string[] = [];
let tokenCount = 0;

if (source.trim().length === 0) {
return {
valid: false,
errors: ["Source is empty."],
warnings,
tokenCount
};
}

try {
tokenCount = tokenizeLuau(source).length;
} catch (error) {
errors.push(
error instanceof Error
? error.message
: "Unable to tokenize source."
);
}

if (/\r(?!\n)/.test(source)) {
warnings.push(
"Source contains standalone carriage-return characters."
);
}

if (source.includes("\u0000")) {
errors.push("Source contains a null character.");
}

warnings.push(
"Lexical checks do not guarantee that the source is valid Luau."
);

return {
valid: errors.length === 0,
errors,
warnings,
tokenCount
};
}
