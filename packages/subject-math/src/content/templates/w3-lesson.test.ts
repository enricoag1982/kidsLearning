// The 8 W3 templates in one test-only lesson (`w3-fixture.ts`, not part of `content/`): it builds through the platform loader with no
// issue, every generated sentence resolves and fits a card, every exercise plays through its own kind, every W3 bug can be spoken, and
// the voice inventory lists what the lesson speaks (the array notes included).
import { describe, expect, it } from 'vitest';
import type { MathExerciseDef } from '../../core/types.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../../testing/play.ts';
import { english, reasonKeys, useFixture } from './fixture-kit.ts';
import {
  W3_FIXTURE_BUGS,
  W3_FIXTURE_LESSON,
  W3_FIXTURE_LESSON_ID,
  W3_FIXTURE_TEMPLATES,
  W3_FIXTURE_TEXTS,
} from './w3-fixture.ts';

const { load, compileWithFixture, defsOf } = useFixture({
  id: W3_FIXTURE_LESSON_ID,
  lesson: W3_FIXTURE_LESSON,
  texts: W3_FIXTURE_TEXTS,
});

/** The kind each template writes. */
const KIND_OF: Readonly<Record<(typeof W3_FIXTURE_TEMPLATES)[number], MathExerciseDef['type']>> = {
  groups: 'number-entry',
  'groups-choice': 'choice',
  'array-build': 'array',
  'array-commute': 'true-false',
  fact: 'number-entry',
  'fact-missing': 'number-entry',
  'fact-choice': 'choice',
  'fact-tf': 'true-false',
};

/** The exercises' stems in the order of the lesson file, with the template and how many each draws. */
const STEMS: readonly (readonly [string, (typeof W3_FIXTURE_TEMPLATES)[number], number])[] = [
  ['fx-total', 'groups', 2],
  ['fx-build', 'array-build', 2],
  ['fx-groups-choice', 'groups-choice', 2],
  ['fx-free', 'array-build', 1],
  ['fx-commute', 'array-commute', 3],
  ['fx-times', 'fact', 4],
  ['fx-low', 'fact', 2],
  ['fx-missing', 'fact-missing', 2],
  ['fx-choice', 'fact-choice', 2],
  ['fx-tf', 'fact-tf', 3],
];

describe('the W3 fixture lesson', () => {
  it('uses every W3 template, and builds with no issue: each expands to the kind it writes, with ids <stem>-<n>', () => {
    expect([...new Set(STEMS.map(([, template]) => template))].sort()).toEqual(
      [...W3_FIXTURE_TEMPLATES].sort(),
    );
    const defs = defsOf(load().content);
    for (const [stem, template, count] of STEMS) {
      const mine = defs.filter((def) => def.id.startsWith(`${stem}-`));
      expect(
        mine.map((def) => def.id),
        stem,
      ).toEqual(Array.from({ length: count }, (_unused, i) => `${stem}-${String(i + 1)}`));
      expect(
        mine.map((def) => def.type),
        stem,
      ).toEqual(mine.map(() => KIND_OF[template]));
    }
    expect(defs).toHaveLength(STEMS.reduce((sum, [, , count]) => sum + count, 0));
  });

  it('resolves every generated sentence in the locales: filled in, at most 14 words, the guided array and groups as asked', () => {
    const { content, locales } = load();
    const lessons = locales.en?.lessons ?? {};
    for (const def of defsOf(content)) {
      expect(def.textKey, def.id).toBe(`lessons:gen.${def.id}.text`);
      const text = english(lessons, def.textKey);
      expect(text, def.id).not.toMatch(/\{\{|undefined/);
      expect(text.split(/\s+/).length, def.id).toBeLessThanOrEqual(14);
    }
    const sentence = (stem: string): string[] =>
      defsOf(content)
        .filter((def) => def.id.startsWith(`${stem}-`))
        .map((def) => english(lessons, def.textKey));
    expect(sentence('fx-total')).toEqual(['How many in all?', 'How many in all?']);
    expect(sentence('fx-build').every((text) => /^Make \d rows of \d dots\./.test(text))).toBe(
      true,
    );
    expect(sentence('fx-free')[0]).toMatch(
      /^Make an array for \d times \d\. Tap the bottom-right dot\.$/,
    );
    expect(
      sentence('fx-groups-choice').every((text) =>
        /^Which sum shows \d groups of \d\?$/.test(text),
      ),
    ).toBe(true);
  });

  it('plays: every exercise is solved by its own kind’s solution with 3 stars, and one wrong try costs exactly one error', () => {
    for (const def of defsOf(load().content)) {
      expect(playSolution(def), def.id).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(playSolution(def)), def.id).toBe(3);
      expect(playWrongThenSolve(def), def.id).toMatchObject({ solved: true, errors: 1 });
    }
  });

  it('can speak every W3 bug (the lessons.yaml sentence resolves for each reason), and only those', () => {
    const { content, locales } = load();
    const keys = new Set(defsOf(content).flatMap(reasonKeys));
    expect([...keys].sort()).toEqual(W3_FIXTURE_BUGS.map((id) => `lessons:bugs.${id}`).sort());
    for (const key of keys) expect(english(locales.en?.lessons ?? {}, key), key).not.toBe('');
  });

  it('lists in the voice inventory every generated sentence, every reason and the array notes the lesson speaks', () => {
    const compiled = compileWithFixture();
    const lessons = compiled.locales.en?.lessons ?? {};
    const listed = new Set(compiled.voiceTexts.entries.map((entry) => entry.text));
    for (const def of defsOf(compiled.content)) {
      expect(listed.has(english(lessons, def.textKey)), def.id).toBe(true);
      for (const key of reasonKeys(def)) expect(listed.has(english(lessons, key)), key).toBe(true);
    }
    for (const text of [
      'How many in all?',
      'Which is the answer?',
      'What number is missing?',
      'Count the rows and the dots in each row.',
      'Rows go across, like lines in a book.',
      'So close, just one off! Count again.',
      'Times means groups: 3 groups of 4.',
    ]) {
      expect(listed.has(text), text).toBe(true);
    }
  });
});
