// The story template over 1 000 seeds per frame and size: every generated problem is solved again here from its English sentence (the
// two numbers in it, the frame's operation), the authored stories are checked as text (animals of the app, at most 20 words, no
// keyword that points at the wrong operation), and `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import { AVATARS } from '@learn/platform-core/domain/avatars';
import {
  STORIES_PER_FRAME,
  STORY_FRAMES,
  storyKey,
  type StoryFrame,
  type StoryItem,
} from './story.ts';
import { AUTHORED_LOCALES, checkIssues, draw, overSeeds, sample } from './testing.ts';

const ANIMALS = AVATARS.map((avatar) => avatar.charAt(0).toUpperCase() + avatar.slice(1));
const ADDS: readonly StoryFrame[] = ['part-whole', 'change-add'];
const SETS = STORY_FRAMES.flatMap((frame) => ([100, 20] as const).map((max) => ({ frame, max })));

/** The authored story texts: `lessons.yaml` `stories.<frame>-<n>`. */
const stories = AUTHORED_LOCALES.en?.lessons?.stories;
const storyText = (frame: StoryFrame, n: number): string => {
  const text = typeof stories === 'object' ? stories[`${frame}-${String(n)}`] : undefined;
  return typeof text === 'string' ? text : '';
};

/** The numbers of a sentence, in the order they appear. */
function numbersOf(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map(([found]) => Number(found));
}

describe('the authored stories', () => {
  it('are exactly the keys the template draws: STORIES_PER_FRAME (at least 3) per frame, none else', () => {
    expect(STORIES_PER_FRAME).toBeGreaterThanOrEqual(3);
    const expected = STORY_FRAMES.flatMap((frame) =>
      Array.from({ length: STORIES_PER_FRAME }, (_unused, i) => `${frame}-${String(i + 1)}`),
    );
    expect(typeof stories === 'object' ? Object.keys(stories).sort() : stories).toEqual(
      [...expected].sort(),
    );
    expect(storyKey('compare', 2)).toBe('stories.compare-2');
  });

  it('have exactly {{a}} and {{b}} once each, at most 20 words, and name only animals of the app', () => {
    for (const frame of STORY_FRAMES) {
      for (let n = 1; n <= STORIES_PER_FRAME; n += 1) {
        const text = storyText(frame, n);
        const at = `${frame}-${String(n)}`;
        expect(text.match(/\{\{a\}\}/g)?.length, at).toBe(1);
        expect(text.match(/\{\{b\}\}/g)?.length, at).toBe(1);
        expect(text.replace(/\{\{[ab]\}\}/g, '').match(/\{\{|\d/), at).toBeNull();
        expect(text.split(/\s+/).length, at).toBeLessThanOrEqual(20);
        const capitals = text
          .split(/\s+/)
          .map((word) => word.replace(/[^A-Za-z{}]/g, ''))
          .filter((word) => /^[A-Z]/.test(word) && !['How', 'Then', 'A'].includes(word));
        expect(capitals.length, at).toBeGreaterThan(0);
        for (const name of capitals) expect(ANIMALS, `${at}: ${name}`).toContain(name);
      }
    }
  });

  it('have no keyword that points at the other operation, and a comparison says "how many more" with a subtraction', () => {
    for (const frame of STORY_FRAMES) {
      for (let n = 1; n <= STORIES_PER_FRAME; n += 1) {
        const text = storyText(frame, n).toLowerCase();
        const at = `${frame}-${String(n)}: ${text}`;
        if (ADDS.includes(frame)) {
          expect(text, at).not.toMatch(/\b(left|fewer|less|remain|away)\b|how many more/);
        } else if (frame === 'change-take') {
          expect(text, at).not.toMatch(/\b(in all|together|altogether|total|more|now|both)\b/);
          expect(text, at).toMatch(/\bleft\b/);
        } else {
          expect(text, at).toMatch(/how many more .* than /);
          expect(text, at).not.toMatch(/\b(left|in all|together|altogether|total|now|both)\b/);
        }
      }
    }
  });

  it('ask a comparison about the animal with the larger number (the number {{a}})', () => {
    for (let n = 1; n <= STORIES_PER_FRAME; n += 1) {
      const text = storyText('compare', n);
      const facts = [...text.matchAll(/(\w+) (?:has|found) (\{\{[ab]\}\})/g)].map(
        ([, name, slot]) => [name, slot],
      );
      const asked = /more \w+ (?:does|did) (\w+) (?:have|find) than (\w+)\?/.exec(text);
      expect(facts, `compare-${String(n)}`).toHaveLength(2);
      expect(asked, `compare-${String(n)}`).not.toBeNull();
      expect(facts.find(([name]) => name === asked?.[1])?.[1], `compare-${String(n)}`).toBe(
        '{{a}}',
      );
      expect(facts.find(([name]) => name === asked?.[2])?.[1], `compare-${String(n)}`).toBe(
        '{{b}}',
      );
    }
  });
});

describe('story', () => {
  describe.each(SETS)('$frame, max $max', ({ frame, max }) => {
    it('answers by the frame’s operation on the two numbers of its sentence, and the other operation is the wrong-op reason', () => {
      const adds = ADDS.includes(frame);
      const { problems, items } = overSeeds<StoryItem>(
        'story',
        { frame, max },
        ({ item, text }) => {
          const [x = 0, y = 0, ...extra] = numbersOf(text);
          const [larger, smaller] = [Math.max(x, y), Math.min(x, y)];
          const answer = adds ? x + y : larger - smaller;
          const wrong = adds ? larger - smaller : x + y;
          const reasons = item.reasons ?? [];
          return [
            ...(extra.length === 0 && numbersOf(text).length === 2
              ? []
              : [`${item.id}: "${text}" has ${String(extra.length + 2)} numbers`]),
            ...(item.answer === answer
              ? []
              : [`${item.id}: "${text}" is ${String(answer)}, not ${String(item.answer)}`]),
            ...(adds
              ? x !== y && x >= 2 && y >= 2 && x + y <= max
                ? []
                : [`${item.id}: "${text}" breaks the addition limits`]
              : larger >= 5 &&
                  larger <= max &&
                  smaller >= 2 &&
                  larger - smaller >= 2 &&
                  (frame === 'compare' || x > y)
                ? []
                : [
                    `${item.id}: "${text}" breaks the subtraction limits (a take-away starts with the larger)`,
                  ]),
            ...(reasons.length === 1 &&
            reasons[0]?.value === wrong &&
            reasons[0].text === 'bugs.wrong-op'
              ? []
              : [`${item.id}: reasons ${JSON.stringify(reasons)} for "${text}"`]),
            ...(item.answer <= max ? [] : [`${item.id}: answer over ${String(max)}`]),
            ...('prompt' in item ? [`${item.id}: a picture on a story`] : []),
            ...(item.maxDigits === undefined || item.maxDigits >= String(wrong).length
              ? []
              : [`${item.id}: maxDigits ${String(item.maxDigits)}`]),
          ];
        },
        20,
      );
      expect(problems).toEqual([]);
      const skeletons = new Set(items.map(({ text }) => text.replace(/\d+/g, '#')));
      expect(skeletons.size).toBe(STORIES_PER_FRAME);
      const numbers = new Set(items.map(({ text }) => numbersOf(text).join()));
      expect(numbers.size).toBeGreaterThan(max === 20 ? 50 : 500);
    });
  });

  it('is the curriculum example: Fox has 9 and 5 berries → 14, and the difference 4 is wrong-op; a comparison of 17 and 12 → 5, and 29', () => {
    const item = (answer: number, wrong: number): StoryItem => ({
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      answer,
      reasons: [{ value: wrong, text: 'bugs.wrong-op' }],
    });
    expect(checkIssues('story', { frame: 'part-whole', max: 100 }, item(14, 4))).toEqual([]);
    expect(checkIssues('story', { frame: 'change-add', max: 100 }, item(14, 4))).toEqual([]);
    expect(checkIssues('story', { frame: 'change-take', max: 100 }, item(5, 29))).toEqual([]);
    expect(checkIssues('story', { frame: 'compare', max: 100 }, item(5, 29))).toEqual([]);
  });

  it('draws 3 distinct items per entry in every set', () => {
    for (const params of SETS) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('story', params, seed, 3).issues,
          `${JSON.stringify(params)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
  });

  it('names its params problems', () => {
    expect(draw('story', { frame: 'times', max: 100 }, 0).issues).not.toEqual([]);
    expect(draw('story', { frame: 'compare', max: 19 }, 0).issues).not.toEqual([]);
    expect(draw('story', { frame: 'compare', max: 101 }, 0).issues).not.toEqual([]);
    expect(draw('story', { frame: 'compare' }, 0).issues).not.toEqual([]);
    expect(draw('story', { max: 100 }, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const adding = { frame: 'part-whole', max: 100 } as const;
    const taking = { frame: 'compare', max: 100 } as const;
    const added = sample<StoryItem>('story', adding);
    const taken = sample<StoryItem>('story', taking);
    const hand = (answer: number, wrong: number, text = 'wrong-op'): StoryItem => ({
      ...added,
      answer,
      reasons: [{ value: wrong, text: `bugs.${text}` }],
    });

    it('accepts good items', () => {
      expect(checkIssues('story', adding, added)).toEqual([]);
      expect(checkIssues('story', taking, taken)).toEqual([]);
    });

    it('reports an answer and a reason that are not the two results of two numbers', () => {
      // odd sum of answer and wrong: no whole numbers
      expect(checkIssues('story', adding, hand(15, 4)).join()).toMatch(/not the two results/);
      // the reason larger than the answer of an addition
      expect(checkIssues('story', adding, hand(4, 14)).join()).toMatch(/not the two results/);
      // equal addends (wrong 0)
      expect(checkIssues('story', adding, hand(10, 0)).join()).toMatch(/not the two results/);
      // an addend of 1
      expect(checkIssues('story', adding, hand(10, 8)).join()).toMatch(/not the two results/);
      // total over max
      expect(checkIssues('story', adding, hand(110, 4)).join()).toMatch(/not the two results/);
      expect(checkIssues('story', { frame: 'part-whole', max: 20 }, hand(30, 4)).join()).toMatch(
        /not the two results/,
      );
      // a subtraction story with an addition's numbers, a difference of 1, a smaller number of 1, larger over max
      expect(checkIssues('story', taking, hand(14, 4)).join()).toMatch(/not the two results/);
      expect(checkIssues('story', taking, hand(1, 13)).join()).toMatch(/not the two results/);
      expect(checkIssues('story', taking, hand(5, 7)).join()).toMatch(/not the two results/);
      expect(checkIssues('story', taking, hand(5, 197)).join()).toMatch(/not the two results/);
      expect(checkIssues('story', { frame: 'compare', max: 20 }, hand(5, 59)).join()).toMatch(
        /not the two results/,
      );
      expect(checkIssues('story', taking, hand(2, 6)).join()).toMatch(/not the two results/);
    });

    it('reports a missing, a repeated and a wrong reason', () => {
      expect(checkIssues('story', adding, { ...added, reasons: undefined }).join()).toMatch(
        /exactly one reason/,
      );
      expect(
        checkIssues('story', adding, {
          ...added,
          reasons: [...(added.reasons ?? []), { value: 1, text: 'bugs.wrong-op' }],
        }).join(),
      ).toMatch(/exactly one reason/);
      expect(checkIssues('story', adding, hand(14, 4, 'off-by-one')).join()).toMatch(/reasons/);
    });
  });
});
