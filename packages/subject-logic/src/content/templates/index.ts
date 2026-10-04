// The generated-exercise templates of logic (`generate: { template: <id>, … }`, docs/adding-a-subject.md §6), by id: the W1 pattern,
// number-step, growing-picture and far-term templates of docs/subjects/logic/curriculum.md §3. The odd-one-out and sudoku generators
// of docs/subjects/logic/plan.md §4 join here with one line each.
import type { AnyExerciseTemplate } from '@learn/platform-content/generate/template';
import { farTerm } from './far.ts';
import { growNext } from './grow.ts';
import { patGap, patNext } from './pattern.ts';
import { stepNext, stepRule } from './steps.ts';

export const LOGIC_TEMPLATES: Readonly<Record<string, AnyExerciseTemplate>> = {
  // W1 (m14.9)
  'pat-next': patNext,
  'pat-gap': patGap,
  'step-next': stepNext,
  'step-rule': stepRule,
  'grow-next': growNext,
  'far-term': farTerm,
};
