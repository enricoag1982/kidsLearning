// The generated-exercise templates of logic (`generate: { template: <id>, … }`, docs/adding-a-subject.md §6), by id: the W1 pattern,
// number-step, growing-picture and far-term templates and the W2 odd-one-out, sorting and line-up templates of
// docs/subjects/logic/curriculum.md §3. The sudoku generators of docs/subjects/logic/plan.md §4 join here with one line each.
import type { AnyExerciseTemplate } from '@learn/platform-content/generate/template';
import { farTerm } from './far.ts';
import { growNext } from './grow.ts';
import { lineUp } from './lineup.ts';
import { oddOne, oddRule } from './odd.ts';
import { patGap, patNext } from './pattern.ts';
import { carroll, sortBoxes, venn } from './sorting.ts';
import { stepNext, stepRule } from './steps.ts';

export const LOGIC_TEMPLATES: Readonly<Record<string, AnyExerciseTemplate>> = {
  // W1 (m14.9)
  'pat-next': patNext,
  'pat-gap': patGap,
  'step-next': stepNext,
  'step-rule': stepRule,
  'grow-next': growNext,
  'far-term': farTerm,
  // W2 (m14.10)
  'odd-one': oddOne,
  'odd-rule': oddRule,
  'sort-boxes': sortBoxes,
  carroll,
  venn,
  'line-up': lineUp,
};
