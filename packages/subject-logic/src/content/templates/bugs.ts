// The known misconceptions ("bugs") of the W1 templates (docs/subjects/logic/curriculum.md §3 "Reasons"): each bug id is an authoring
// name and a `lessons:` text `bugs.<id>` (the one sentence spoken when the wrong answer matches). The wrong answer each one models is
// computed in the template that offers it (`pattern.ts`, `steps.ts`, `grow.ts`, `far.ts`).

export const BUG_IDS = ['unit-break', 'first-jump', 'grow-off', 'far-off'] as const;

export type BugId = (typeof BUG_IDS)[number];

/** The text ref of a bug's reason (`lessons.yaml` `bugs.<id>`), as a YAML `reason` / `reasons[].text` writes it. */
export function bugRef(id: BugId): string {
  return `bugs.${id}`;
}
