/**
 * VXC Shield Stage 8.2: conservative identifier reference inventory.
 *
 * Analysis-only. Scope resolution and shadowing are not implemented.
 * Do not use this inventory for automatic identifier renaming.
 */

import {
  tokenizeLuau,
  type LexToken
} from "./identifier-analysis";

import {
  analyzeLocalDeclarations
} from "./scope-analysis";

export type IdentifierOccurrenceRole =
  | "local-declaration"
  | "other-occurrence";

export interface IdentifierOccurrence {
  name: string;
  start: number;
  end: number;
  role: IdentifierOccurrenceRole;
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

const SUMMARY_NOTE =
  "Occurrences are grouped by spelling only; lexical scope, shadowing, " +
  "global resolution, parameters, and loop bindings are unresolved.";

export function analyzeIdentifierReferences(
  source: string
): IdentifierReferenceAnalysis {
  const tokens: LexToken[] = tokenizeLuau(source);

  const declarations =
    analyzeLocalDeclarations(source).declarations;

  // declarationStart is the source offset of the declared identifier.
  const declarationOffsets = new Set<number>(
    declarations.map(item => item.declarationStart)
  );

  const occurrences: IdentifierOccurrence[] = tokens
    .filter(token => token.kind === "identifier")
    .map(token => ({
      name: token.value,
      start: token.start,
      end: token.end,
      role: declarationOffsets.has(token.start)
        ? "local-declaration"
        : "other-occurrence"
    }));

  const byName = new Map<string, IdentifierOccurrence[]>();

  for (const occurrence of occurrences) {
    const bucket = byName.get(occurrence.name) ?? [];
    bucket.push(occurrence);
    byName.set(occurrence.name, bucket);
  }

  const summaries: IdentifierReferenceSummary[] = [];

  for (const [name, bucket] of byName) {
    const declarationOccurrences = bucket.filter(
      occurrence => occurrence.role === "local-declaration"
    );

    const otherOccurrences = bucket.filter(
      occurrence => occurrence.role === "other-occurrence"
    );

    summaries.push({
      name,
      declarationCount: declarationOccurrences.length,
      otherOccurrenceCount: otherOccurrences.length,
      declarationOffsets: declarationOccurrences.map(
        occurrence => occurrence.start
      ),
      otherOffsets: otherOccurrences.map(
        occurrence => occurrence.start
      ),
      confidence: "low",
      note: SUMMARY_NOTE
    });
  }

  return {
    occurrences,
    summaries,
    warnings: [
      "Analysis-only: do not rename identifiers based on these counts.",
      "Same-spelling identifiers are grouped together even across different scopes.",
      "Shadowing and lexical scope resolution are not implemented.",
      "Function parameters, loop variables, globals, and Luau type syntax are not fully classified."
    ]
  };
}
