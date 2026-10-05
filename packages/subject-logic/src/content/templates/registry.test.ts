// The registry of logic's generated-exercise templates: exactly the W1, W2 and W3 templates of the curriculum (§3), each with the text(s)
// its sentence needs in `lessons.yaml`.
import { describe, expect, it } from 'vitest';
import { LOGIC_TEMPLATES, logicContent } from '../logic-content.ts';
import { AUTHORED_LOCALES } from './testing.ts';

/** The W1 templates (m14.9), the W2 templates (m14.10) and the W3 sudoku templates (m14.11). */
const W1_TEMPLATES = ['far-term', 'grow-next', 'pat-gap', 'pat-next', 'step-next', 'step-rule'];
const W2_TEMPLATES = ['carroll', 'line-up', 'odd-one', 'odd-rule', 'sort-boxes', 'venn'];
const W3_TEMPLATES = ['sdk-last', 'sdk-number', 'sdk-place', 'sdk-six'];
const TEMPLATES = [...W1_TEMPLATES, ...W2_TEMPLATES, ...W3_TEMPLATES].sort();

/** The `templates.<key>` texts: one sentence per template, two for grow-next (picture / count) and for line-up (size / count), the four
 * rule cards of step-rule, the word tables of the W2 sorting templates (`label`, `not`, `same`) and the sudoku sentences (`sdk-guided` for
 * every guided item). */
const TEXT_KEYS = [
  'pat-next',
  'pat-gap',
  'step-next',
  'step-rule',
  'grow-next-choice',
  'grow-next-entry',
  'far-term',
  'rule-step',
  'rule-double',
  'rule-alt',
  'rule-grow',
  'odd-one',
  'odd-rule',
  'sort-boxes',
  'carroll',
  'venn',
  'line-up-size',
  'line-up-count',
  'label',
  'not',
  'same',
  'sdk-guided',
  'sdk-last',
  'sdk-place',
  'sdk-number',
  'sdk-six',
];

/** The values each word table covers: every colour, kind, size and count a sorting template can draw, and the 4 animal facts. */
const COLOURS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];
const KINDS = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
const SIZES = ['tiny', 'medium', 'huge'];
const COUNTS = ['1', '2', '3', '4', '5', '6'];
const FACTS = ['can-fly', 'can-swim', 'four-legs', 'farm'];
const VALUE_KEYS = [
  ...COLOURS.map((value) => `colour-${value}`),
  ...KINDS.map((value) => `kind-${value}`),
  ...SIZES.map((value) => `size-${value}`),
];

describe('the registry', () => {
  it('holds exactly the 6 W1, 6 W2 and 4 W3 templates of the curriculum, in the content too', () => {
    expect(Object.keys(LOGIC_TEMPLATES).sort()).toEqual(TEMPLATES);
    expect(Object.keys(logicContent.templates ?? {}).sort()).toEqual(TEMPLATES);
  });

  it('has a template text in lessons.yaml for exactly the sentences the templates use', () => {
    const texts = AUTHORED_LOCALES.en?.lessons?.templates;
    expect(typeof texts === 'object' ? Object.keys(texts).sort() : texts).toEqual(
      [...TEXT_KEYS].sort(),
    );
  });

  it('words the fixed sentences as the curriculum does', () => {
    const texts = AUTHORED_LOCALES.en?.lessons?.templates;
    expect(texts).toMatchObject({
      'pat-next': 'What comes next?',
      'pat-gap': 'What is missing?',
      'step-next': 'What number comes next?',
      'step-rule': 'Which rule makes these numbers?',
      'grow-next-choice': 'Which picture comes next?',
      'grow-next-entry': 'How many in step {{n}}?',
      'far-term': 'Which shape is number {{n}}?',
      'odd-one': 'Which one is different?',
      'odd-rule': 'What is the same about all of them?',
      'sort-boxes': 'Put each card in its box.',
      carroll: 'Look at both rules. Where does each card go?',
      venn: 'Where does each card go? The middle fits both.',
      'line-up-size': 'Put them in order, smallest first.',
      'line-up-count': 'Put them in order, fewest first.',
      'sdk-guided': 'Which number goes in the ringed cell?',
      'sdk-last': 'Fill the grid. Look for a row, column or box with one empty cell.',
      'sdk-place': 'Fill the grid. For each number, find the only place it can go in a box.',
      'sdk-number': 'Fill the grid. For each empty cell, find the only number left.',
      'sdk-six': 'Fill the big grid: each row, column and box has 1 to 6 once.',
    });
  });

  it('has a box / axis word for every value a sorting template draws, its "Not …" and, for colours, kinds and sizes, the "They are all …" sentence', () => {
    const texts = AUTHORED_LOCALES.en?.lessons?.templates as Record<string, Record<string, string>>;
    expect(Object.keys(texts.label ?? {}).sort()).toEqual(
      [...VALUE_KEYS, ...COUNTS.map((n) => `count-${n}`), ...FACTS].sort(),
    );
    expect(Object.keys(texts.not ?? {}).sort()).toEqual(Object.keys(texts.label ?? {}).sort());
    expect(Object.keys(texts.same ?? {}).sort()).toEqual([...VALUE_KEYS].sort());
    expect(texts.label).toMatchObject({
      'colour-red': 'Red',
      'kind-circle': 'Circles',
      'size-tiny': 'Tiny',
      'count-3': 'Three',
      'can-fly': 'Can fly',
      'can-swim': 'Can swim',
    });
    expect(texts.not).toMatchObject({ 'colour-red': 'Not red', 'kind-circle': 'Not circles' });
    expect(texts.same).toMatchObject({
      'colour-red': 'They are all red.',
      'kind-circle': 'They are all circles.',
      'size-tiny': 'They are all tiny.',
    });
  });
});
