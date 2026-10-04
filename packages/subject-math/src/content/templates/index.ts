// The generated-exercise templates of math (`generate: { template: <id>, … }`, docs/adding-a-subject.md §6), by id: the W1 place
// value, comparing, number line and rounding templates of docs/subjects/math/curriculum.md §3.
import type { AnyExerciseTemplate } from '@learn/platform-content/generate/template';
import { cmpOrder, cmpSign, cmpTf } from './compare.ts';
import { pvBuild, pvExpanded, pvRead, pvWhich } from './place-value.ts';

export const MATH_TEMPLATES: Readonly<Record<string, AnyExerciseTemplate>> = {
  'pv-build': pvBuild,
  'pv-read': pvRead,
  'pv-which': pvWhich,
  'pv-expanded': pvExpanded,
  'cmp-sign': cmpSign,
  'cmp-order': cmpOrder,
  'cmp-tf': cmpTf,
};
