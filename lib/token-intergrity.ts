/**

* VXC Shield Stage 12
* Token integrity checks for VXC Shield.
* 
* Analysis only. Does not modify source code.
  */

import { tokenizeLuau } from "./identifier-analysis";

export interface TokenIntegrityResult {
valid: boolean;
tokenCount: number;
stringCount: number;
errors: string[];
warnings: string[];
}

export function checkTokenIntegrity(
source: string
): TokenIntegrityResult {
if (typeof source !== "string") {
return {
valid: false,
tokenCount: 0,
stringCount: 0,
errors: ["Source must be a string."],
warnings: []
};
}

const errors: string[] = [];
const warnings: string[] = [];

try {
const tokens = tokenizeLuau(source);
let previousEnd = 0;
let stringCount = 0;

for (const token of tokens) {
  if (
    token.start < previousEnd ||
    token.end < token.start ||
    token.end > source.length
  ) {
    errors.push(
      `Invalid token boundaries at offset ${token.start}.`
    );
  }

  if (token.kind === "string") {
    stringCount++;

    const original = source.slice(
      token.start,
      token.end
    );

    if (original !== token.value) {
      errors.push(
        `String token mismatch at offset ${token.start}.`
      );
    }
  }

  previousEnd = token.end;
}

warnings.push(
  "Lexical integrity checks do not guarantee valid Luau syntax."
);

return {
  valid: errors.length === 0,
  tokenCount: tokens.length,
  stringCount,
  errors,
  warnings
};

} catch (error) {
errors.push(
error instanceof Error
? error.message
: "Unable to check token integrity."
);

return {
  valid: false,
  tokenCount: 0,
  stringCount: 0,
  errors,
  warnings
};

}
}
