/**

* VXC Shield Stage 7
* Unified analysis report for identifier and binding candidates.
* 
* Analysis only. This module does not modify source code.
  */

import { tokenizeLuau } from "./identifier-analysis";
import { analyzeLocalDeclarations } from "./scope-analysis";
import { analyzeIdentifierReferences } from "./identifier-references";
import { analyzeBindings } from "./binding-analysis";

export interface ShieldFinding {
category:
| "local-declaration"
| "identifier-occurrence"
| "function-parameter"
| "numeric-for"
| "generic-for";
name: string;
start: number;
end: number;
confidence: "low";
note: string;
}

export interface ShieldAnalysisReport {
sourceLength: number;
tokenCount: number;
findings: ShieldFinding[];
warnings: string[];
}

export function analyzeShieldSource(
source: string
): ShieldAnalysisReport {
if (typeof source !== "string") {
throw new Error("Source must be a string.");
}

const tokens = tokenizeLuau(source);
const localResult = analyzeLocalDeclarations(source);
const referenceResult = analyzeIdentifierReferences(source);
const bindingResult = analyzeBindings(source);

const findings: ShieldFinding[] = [];

for (const declaration of localResult.declarations) {
findings.push({
category: "local-declaration",
name: declaration.name,
start: declaration.declarationStart,
end: declaration.declarationEnd,
confidence: "low",
note: declaration.note
});
}

for (const occurrence of referenceResult.occurrences) {
findings.push({
category: "identifier-occurrence",
name: occurrence.name,
start: occurrence.start,
end: occurrence.end,
confidence: "low",
note:
"Identifier occurrence only; binding and scope are not resolved."
});
}

for (const binding of bindingResult.bindings) {
findings.push({
category: binding.form,
name: binding.name,
start: binding.start,
end: binding.end,
confidence: "low",
note: binding.note
});
}

const warnings = [
...localResult.warnings,
...referenceResult.warnings,
...bindingResult.warnings,
"Unified report is for review only; it does not guarantee correct Luau semantics.",
"No source transformation or identifier renaming is performed."
];

return {
sourceLength: source.length,
tokenCount: tokens.length,
findings: findings.sort((a, b) => a.start - b.start),
warnings: [...new Set(warnings)]
};
}
