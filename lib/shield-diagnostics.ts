/**

* VXC Shield Stage 13
* Unified diagnostic report.
* 
* Analysis only: does not modify source code.
  */

import { checkLuauSource } from "./syntax-guard";
import { checkLexerBoundaries } from "./lexer-boundaries";
import { checkTokenIntegrity } from "./token-integrity";
import { analyzeShieldSource } from "./shield-analysis";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface ShieldDiagnostic {
severity: DiagnosticSeverity;
source: string;
message: string;
}

export interface ShieldDiagnosticsReport {
valid: boolean;
sourceLength: number;
diagnostics: ShieldDiagnostic[];
summary: {
errors: number;
warnings: number;
info: number;
};
}

export function diagnoseShieldSource(
source: string
): ShieldDiagnosticsReport {
if (typeof source !== "string") {
throw new Error("Source must be a string.");
}

const diagnostics: ShieldDiagnostic[] = [];

const syntax = checkLuauSource(source);
const lexer = checkLexerBoundaries(source);
const integrity = checkTokenIntegrity(source);
const analysis = analyzeShieldSource(source);

for (const message of syntax.errors) {
diagnostics.push({
severity: "error",
source: "syntax-guard",
message
});
}

for (const message of syntax.warnings) {
diagnostics.push({
severity: "warning",
source: "syntax-guard",
message
});
}

for (const message of lexer.errors) {
diagnostics.push({
severity: "error",
source: "lexer-boundaries",
message
});
}

for (const message of lexer.warnings) {
diagnostics.push({
severity: "warning",
source: "lexer-boundaries",
message
});
}

for (const message of integrity.errors) {
diagnostics.push({
severity: "error",
source: "token-integrity",
message
});
}

for (const message of integrity.warnings) {
diagnostics.push({
severity: "warning",
source: "token-integrity",
message
});
}

for (const message of analysis.warnings) {
diagnostics.push({
severity: "info",
source: "shield-analysis",
message
});
}

const summary = {
errors: diagnostics.filter(
item => item.severity === "error"
).length,
warnings: diagnostics.filter(
item => item.severity === "warning"
).length,
info: diagnostics.filter(
item => item.severity === "info"
).length
};

return {
valid: summary.errors === 0,
sourceLength: source.length,
diagnostics,
summary
};
}
