// The generated-exercise templates of math (`generate: { template: <id>, … }`, docs/adding-a-subject.md §6), by id: the W1 place
// value, comparing, number line and rounding templates, the W2 mental-math ones and the W3 groups, arrays and times-table facts of
// docs/subjects/math/curriculum.md §3.
import type { AnyExerciseTemplate } from '@learn/platform-content/generate/template';
import { arrayBuild, arrayCommute } from './array.ts';
import { bondMissing, bondPairs, equalsBalance } from './bonds.ts';
import { bridgeAdd, countUp } from './bridge.ts';
import { cmpOrder, cmpSign, cmpTf } from './compare.ts';
import { double, halve, nearDouble } from './doubles.ts';
import { fact, factChoice, factMissing, factTf } from './fact.ts';
import { groups, groupsChoice } from './groups.ts';
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
  // W3 (m13.14)
  groups,
  'groups-choice': groupsChoice,
  'array-build': arrayBuild,
  'array-commute': arrayCommute,
  fact,
  'fact-missing': factMissing,
  'fact-choice': factChoice,
  'fact-tf': factTf,
};
