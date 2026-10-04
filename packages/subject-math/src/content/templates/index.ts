// The generated-exercise templates of math (`generate: { template: <id>, … }`, docs/adding-a-subject.md §6), by id: the W1 place
// value, comparing, number line and rounding templates and the W2 mental-math ones of docs/subjects/math/curriculum.md §3.
import type { AnyExerciseTemplate } from '@learn/platform-content/generate/template';
import { bondMissing, bondPairs, equalsBalance } from './bonds.ts';
import { bridgeAdd, countUp } from './bridge.ts';
import { cmpOrder, cmpSign, cmpTf } from './compare.ts';
import { double, halve, nearDouble } from './doubles.ts';
import { nlEstimate, nlHalf, nlPlace } from './number-line.ts';
import { pvBuild, pvExpanded, pvRead, pvWhich } from './place-value.ts';
import { roundHundred, roundTen, roundTf } from './rounding.ts';
import { story } from './story.ts';
import { compensate, tensHundreds } from './tens.ts';

export const MATH_TEMPLATES: Readonly<Record<string, AnyExerciseTemplate>> = {
  'pv-build': pvBuild,
  'pv-read': pvRead,
  'pv-which': pvWhich,
  'pv-expanded': pvExpanded,
  'cmp-sign': cmpSign,
  'cmp-order': cmpOrder,
  'cmp-tf': cmpTf,
  'nl-place': nlPlace,
  'nl-estimate': nlEstimate,
  'nl-half': nlHalf,
  'round-ten': roundTen,
  'round-hundred': roundHundred,
  'round-tf': roundTf,
  // W2 (m13.11)
  'bond-missing': bondMissing,
  'bond-pairs': bondPairs,
  double,
  'near-double': nearDouble,
  halve,
  'bridge-add': bridgeAdd,
  'count-up': countUp,
  'tens-hundreds': tensHundreds,
  compensate,
  'equals-balance': equalsBalance,
  story,
};
