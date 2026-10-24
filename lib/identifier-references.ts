/**
 * VXC Shield Stage 5: conservative identifier occurrence inventory.
 * This is analysis-only. Do not use it to rename code automatically.
 */
import { tokenizeLuau, type LexToken } from "./identifier-analysis";
import { analyzeLocalDeclarations } from "./scope-analysis";

export interface IdentifierOccurrence {
  name: string;
  start: number;
  end: number;
  role: "local-declaration" | "other-occurrence";
}

export interface IdentifierReferenceSummary {
  name: string;
  declarationCount: number;
  otherOccurrenceCount: number;
  declarationOffsets: number[];
  otherOffsets: number[];
  confidence: "low";
  note: string;
}

export interface IdentifierReferenceAnalysis {
  occurrences: IdentifierOccurrence[];
  summaries: IdentifierReferenceSummary[];
  warnings: string[];
}

export function analyzeIdentifierReferences(source: string): IdentifierReferenceAnalysis {
  const tokens: LexToken[] = tokenizeLuau(source);
  const declarations = analyzeLocalDeclarations(source).declarations;
  const declarationOffsets = new Set(declarations.map(item => item.declarationStart));
  const occurrences: IdentifierOccurrence[] = tokens
    .filter(token => token.kind === "identifier")
    .map(token => ({
      name: token.value,
      start: token.start,
      end: token.end,
      role: declarationOffsets.has(token.start) ? "local-declaration" : "other-occurrence"
    }));

  const byName = new Map<string, IdentifierOccurrence[]>();
  for (const occurrence of occurrences) {
    const bucket = byName.get(occurrence.name) ?? [];
    bucket.push(occurrence);
    byName.set(occurrence.name, bucket);
  }

  const summaries: IdentifierReferenceSummary[] = [];
  for (const [name, bucket] of byName) {
    const declarationsForName = bucket.filter(item => item.role === "local-declaration");
    const others = bucket.filter(item => item.role === "other-occurrence");
    summaries.push({
      name,
      declarationCount: declarationsForName.length,
      otherOccurrenceCount: others.length,
      declarationOffsets: declarationsForName.map(item => item.start),
      otherOffsets: others.map(item => item.start),
      confidence: "low",
      note: "Occurrences are grouped by spelling only; scope, shadowing, globals, and parameter bindings are unresolved."
    });
  }

  return {
    occurrences,
    summaries,
    warnings: [
      "Analysis-only: do not rename identifiers based on these counts.",
      "Same-spelling identifiers in different scopes are grouped together.",
      "Function parameters, loop variables, and Luau type syntax are not fully classified."
    ]
  };
}
