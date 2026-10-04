// The registry of math's generated-exercise templates: exactly the W1 and W2 templates of the curriculum (§3), each with the text(s)
// its sentence needs in `lessons.yaml`.
import { describe, expect, it } from 'vitest';
import { mathContent, MATH_TEMPLATES } from '../math-content.ts';
import { W1_FIXTURE_TEMPLATES } from './w1-fixture.ts';
import { AUTHORED_LOCALES } from './testing.ts';

/** The W2 templates (m13.11). */
const W2_TEMPLATES = [
  'bond-missing',
  'bond-pairs',
  'double',
  'near-double',
  'halve',
  'bridge-add',
  'count-up',
  'tens-hundreds',
  'compensate',
  'equals-balance',
  'story',
] as const;

/** The `templates.<key>` texts: one per template, but the 4-digit variants of pv-read / pv-which, the two sentences of compensate,
 * and none for story (its sentences are the authored `stories.*`). */
const TEXT_KEYS = [
  ...W1_FIXTURE_TEMPLATES,
  'pv-read-4',
  'pv-which-4',
  ...W2_TEMPLATES.filter((template) => template !== 'compensate' && template !== 'story'),
  'compensate-add',
  'compensate-take',
];

describe('the registry', () => {
  it('holds exactly the 13 W1 and the 11 W2 templates of the curriculum', () => {
    const expected = [...W1_FIXTURE_TEMPLATES, ...W2_TEMPLATES].sort();
    expect(Object.keys(MATH_TEMPLATES).sort()).toEqual(expected);
    expect(Object.keys(mathContent.templates ?? {}).sort()).toEqual(expected);
  });

  it('has a template text in lessons.yaml for exactly the sentences the templates use', () => {
    const texts = AUTHORED_LOCALES.en?.lessons?.templates;
    expect(typeof texts === 'object' ? Object.keys(texts).sort() : texts).toEqual(
      [...TEXT_KEYS].sort(),
    );
  });
});
