// `groups` and `groups-choice` over 1 000 seeds per parameter combination: each item is solved again here from its English sentence and
// card, and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { ChoiceItem, PictureNumberEntryItem } from './items.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

describe('groups', () => {
  const combos = [
    { maxGroups: 3, maxSize: 3 },
    { maxGroups: 4, maxSize: 5 },
    { maxGroups: 5, maxSize: 5 },
  ] as const;

  describe.each(combos)('maxGroups $maxGroups, maxSize $maxSize', (params) => {
    it('says "k groups of n" with one picture, asks for the total, speaks add-factors for k + n unless it is the total', () => {
      const { problems, items } = overSeeds<PictureNumberEntryItem>(
        'groups',
        params,
        ({ item, text }) => {
          const found = /^(\d+) groups of (\d+)$/.exec(item.prompt.big);
          const [k, n] = [Number(found?.[1]), Number(found?.[2])];
          const reasons = item.reasons ?? [];
          return [
            ...(text === 'How many in all?' ? [] : [`${item.id}: text "${text}"`]),
            ...(found !== null && k >= 2 && k <= params.maxGroups && n >= 2 && n <= params.maxSize
              ? []
              : [`${item.id}: "${item.prompt.big}" does not fit the params`]),
            ...(item.answer === k * n
              ? []
              : [
                  `${item.id}: ${item.prompt.big} is ${String(k * n)}, answer ${String(item.answer)}`,
                ]),
            ...(Array.from(new Intl.Segmenter('en').segment(item.prompt.emoji)).length === 1
              ? []
              : [`${item.id}: emoji ${item.prompt.emoji}`]),
            ...(k + n === k * n
              ? reasons.length === 0
                ? []
                : [`${item.id}: a reason although 2 + 2 is 2 × 2`]
              : reasons.length === 1 &&
                  reasons[0]?.value === k + n &&
                  reasons[0].text === 'bugs.add-factors'
                ? []
                : [`${item.id}: reasons ${JSON.stringify(reasons)}`]),
          ];
        },
      );
      expect(problems).toEqual([]);
      const shapes = new Set(items.map(({ item }) => item.prompt.big));
      expect(shapes.has(`${String(params.maxGroups)} groups of ${String(params.maxSize)}`)).toBe(
        true,
      );
      expect(shapes.has('2 groups of 2')).toBe(true);
      expect(shapes.size).toBe((params.maxGroups - 1) * (params.maxSize - 1));
    });
  });

  it('draws the same picture for the same numbers, so the expander tells a repeat', () => {
    const emojiOf = (seed: number): string[] =>
      draw<PictureNumberEntryItem>('groups', { maxGroups: 4, maxSize: 4 }, seed, 12).drawn.map(
        ({ item }) => `${item.prompt.big} ${item.prompt.emoji}`,
      );
    const bigToEmoji = new Map<string, string>();
    for (let seed = 0; seed < 30; seed += 1) {
      for (const line of emojiOf(seed)) {
        const [big, emoji] = [
          line.slice(0, line.lastIndexOf(' ')),
          line.slice(line.lastIndexOf(' ') + 1),
        ];
        expect(bigToEmoji.get(big) ?? emoji, big).toBe(emoji);
        bigToEmoji.set(big, emoji);
      }
    }
  });

  it('is the curriculum example: 3 groups of 4 is 12, and 7 is the add-factors bug', () => {
    const item = (
      big: string,
      answer: number,
      reasons?: PictureNumberEntryItem['reasons'],
    ): PictureNumberEntryItem => ({
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { emoji: '🍎', big },
      answer,
      ...(reasons === undefined ? {} : { reasons }),
    });
    expect(
      checkIssues(
        'groups',
        { maxGroups: 3, maxSize: 5 },
        item('3 groups of 4', 12, [{ value: 7, text: 'bugs.add-factors' }]),
      ),
    ).toEqual([]);
    expect(checkIssues('groups', { maxGroups: 3, maxSize: 3 }, item('2 groups of 2', 4))).toEqual(
      [],
    );
  });

  it('draws 3 distinct items per entry in every combination, and names its params problems', () => {
    for (const params of combos) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('groups', params, seed, 3).issues,
          `${JSON.stringify(params)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
    expect(draw('groups', { maxGroups: 2, maxSize: 3 }, 0).issues).not.toEqual([]);
    expect(draw('groups', { maxGroups: 3, maxSize: 6 }, 0).issues).not.toEqual([]);
    expect(draw('groups', { maxGroups: 3 }, 0).issues).not.toEqual([]);
  });

  describe('check', () => {
    const params = { maxGroups: 4, maxSize: 4 };
    const plain = sample<PictureNumberEntryItem>(
      'groups',
      params,
      (item) => item.reasons !== undefined,
    );
    const square = sample<PictureNumberEntryItem>(
      'groups',
      { maxGroups: 2 + 1, maxSize: 3 },
      (item) => item.prompt.big === '2 groups of 2',
    );

    it('accepts good items (with the reason, and 2 groups of 2 without)', () => {
      expect(checkIssues('groups', params, plain)).toEqual([]);
      expect(checkIssues('groups', { maxGroups: 3, maxSize: 3 }, square)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable card, numbers outside the params, an empty picture', () => {
      expect(checkIssues('groups', params, { ...plain, answer: plain.answer + 1 }).join()).toMatch(
        /is \d+, not/,
      );
      expect(
        checkIssues('groups', params, {
          ...plain,
          prompt: { ...plain.prompt, big: '3 × 4' },
        }).join(),
      ).toMatch(/cannot read the prompt/);
      expect(
        checkIssues('groups', params, {
          ...plain,
          prompt: { ...plain.prompt, big: '5 groups of 4' },
          answer: 20,
        }).join(),
      ).toMatch(/does not fit/);
      expect(
        checkIssues('groups', params, {
          ...plain,
          prompt: { ...plain.prompt, big: '3 groups of 1' },
          answer: 3,
        }).join(),
      ).toMatch(/does not fit/);
      expect(
        checkIssues('groups', params, { ...plain, prompt: { ...plain.prompt, emoji: '' } }).join(),
      ).toMatch(/picture/);
    });

    it('reports a missing, a wrong and an unneeded reason', () => {
      expect(checkIssues('groups', params, { ...plain, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
      expect(
        checkIssues('groups', params, {
          ...plain,
          reasons: [{ value: 1, text: 'bugs.add-factors' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('groups', params, {
          ...plain,
          reasons: [{ value: plain.reasons?.[0]?.value ?? 0, text: 'bugs.neighbour' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues(
          'groups',
          { maxGroups: 3, maxSize: 3 },
          { ...square, reasons: [{ value: 4, text: 'bugs.add-factors' }] },
        ).join(),
      ).toMatch(/reasons/);
    });
  });
});

describe('groups-choice', () => {
  const combos = [
    { maxGroups: 3, maxSize: 3 },
    { maxGroups: 4, maxSize: 3 },
    { maxGroups: 4, maxSize: 4 },
  ] as const;

  /** The terms of an option's sum. */
  const termsOf = (big: string): number[] => big.split(' + ').map(Number);

  describe.each(combos)('maxGroups $maxGroups, maxSize $maxSize', (params) => {
    it('has exactly one sum of k terms that are all n, the added factors with add-factors, and a third that is a spoken neighbour only when k = n', () => {
      const { problems, items } = overSeeds<ChoiceItem>(
        'groups-choice',
        params,
        ({ item, text }) => {
          const found = /^Which sum shows (\d+) groups of (\d+)\?$/.exec(text);
          const [k, n] = [Number(found?.[1]), Number(found?.[2])];
          const showing = item.options.filter((option) => {
            const terms = termsOf(option.big);
            return terms.length === k && terms.every((term) => term === n);
          });
          const wrong = item.options.filter((option) => option.id !== item.answer);
          const added = wrong.find((option) => option.big === `${String(k)} + ${String(n)}`);
          const third = wrong.find((option) => option !== added);
          const thirdTerms = termsOf(third?.big ?? '');
          return [
            ...(found === null ? [`${item.id}: "${text}" is not the groups sentence`] : []),
            ...(item.prompt?.big === `${String(k)} groups of ${String(n)}`
              ? []
              : [`${item.id}: card ${item.prompt?.big ?? ''}`]),
            ...(k >= 2 &&
            k <= params.maxGroups &&
            n >= 2 &&
            n <= params.maxSize &&
            !(k === 2 && n === 2)
              ? []
              : [`${item.id}: ${String(k)} groups of ${String(n)} does not fit`]),
            ...(item.options.map((option) => option.id).join() === 'a,b,c'
              ? []
              : [`${item.id}: ids`]),
            ...(showing.length === 1 &&
            showing[0]?.id === item.answer &&
            showing[0].reason === undefined
              ? []
              : [
                  `${item.id}: ${String(showing.length)} sums show ${String(k)} groups of ${String(n)}`,
                ]),
            ...(item.options.every(
              (option) => option.big.length <= 16 && termsOf(option.big).length <= 4,
            )
              ? []
              : [`${item.id}: a sum is too long`]),
            ...(added?.reason === 'bugs.add-factors' && wrong.length === 2
              ? []
              : [`${item.id}: the added factors ${String(k)} + ${String(n)} lack their reason`]),
            ...(k === n
              ? thirdTerms.every((term) => term === n) &&
                thirdTerms.length !== k &&
                thirdTerms.length !== 2 &&
                Math.abs(thirdTerms.length - k) === 1 &&
                third?.reason === 'bugs.neighbour'
                ? []
                : [
                    `${item.id}: third option ${third?.big ?? ''} for ${String(k)} groups of ${String(n)}`,
                  ]
              : thirdTerms.length === n &&
                  thirdTerms.every((term) => term === k) &&
                  third?.reason === undefined
                ? []
                : [
                    `${item.id}: third option ${third?.big ?? ''} for ${String(k)} groups of ${String(n)}`,
                  ]),
          ];
        },
      );
      expect(problems).toEqual([]);
      // The right sum sits in every place about a third of the time.
      for (const id of ['a', 'b', 'c']) {
        const count = items.filter(({ item }) => item.answer === id).length;
        expect(count, id).toBeGreaterThan(250);
        expect(count, id).toBeLessThan(420);
      }
      // 3 groups of 3 turns the third option into 3 + 3 + 3 + 3; 4 groups of 4 into 4 + 4 + 4.
      const thirds = new Set(
        items.flatMap(({ item }) =>
          item.options
            .filter((option) => option.reason === 'bugs.neighbour')
            .map((option) => option.big),
        ),
      );
      expect(thirds.has('3 + 3 + 3 + 3')).toBe(true);
      if (params.maxGroups === 4 && params.maxSize === 4)
        expect(thirds.has('4 + 4 + 4')).toBe(true);
    });
  });

  it('is the curriculum example: 3 groups of 4 → 4 + 4 + 4, with 3 + 4 the add-factors bug and 3 + 3 + 3 + 3 a plain wrong answer', () => {
    const item: ChoiceItem = {
      id: 'dr-1',
      type: 'choice',
      text: 'gen.dr-1.text',
      prompt: { big: '3 groups of 4' },
      options: [
        { id: 'a', big: '3 + 3 + 3 + 3' },
        { id: 'b', big: '4 + 4 + 4' },
        { id: 'c', big: '3 + 4', reason: 'bugs.add-factors' },
      ],
      answer: 'b',
    };
    expect(checkIssues('groups-choice', { maxGroups: 4, maxSize: 4 }, item)).toEqual([]);
  });

  it('draws 3 distinct items per entry in every combination, and names its params problems', () => {
    for (const params of combos) {
      for (let seed = 0; seed < 50; seed += 1) {
        expect(
          draw('groups-choice', params, seed, 2).issues,
          `${JSON.stringify(params)} @${String(seed)}`,
        ).toEqual([]);
      }
    }
    // Five terms would not fit a 16-character card.
    expect(draw('groups-choice', { maxGroups: 5, maxSize: 3 }, 0).issues.join('\n')).toMatch(
      /maxGroups/,
    );
    expect(draw('groups-choice', { maxGroups: 3, maxSize: 5 }, 0).issues.join('\n')).toMatch(
      /maxSize/,
    );
  });

  describe('check', () => {
    const params = { maxGroups: 4, maxSize: 4 };
    const swapped = sample<ChoiceItem>(
      'groups-choice',
      params,
      (item) => item.prompt?.big === '3 groups of 4',
    );
    const alike = sample<ChoiceItem>(
      'groups-choice',
      params,
      (item) => item.prompt?.big === '3 groups of 3',
    );
    const withOptions = (
      item: ChoiceItem,
      edit: (option: ChoiceItem['options'][number]) => ChoiceItem['options'][number],
    ): ChoiceItem => ({
      ...item,
      options: item.options.map(edit),
    });

    it('accepts good items (k ≠ n and k = n)', () => {
      expect(checkIssues('groups-choice', params, swapped)).toEqual([]);
      expect(checkIssues('groups-choice', params, alike)).toEqual([]);
    });

    it('reports a wrong answer, an unreadable card, numbers outside the params', () => {
      const other = swapped.options.find((option) => option.id !== swapped.answer)?.id ?? 'a';
      expect(checkIssues('groups-choice', params, { ...swapped, answer: other }).join()).toMatch(
        /should show 3 groups of 4/,
      );
      expect(
        checkIssues('groups-choice', params, { ...swapped, prompt: { big: '3 × 4' } }).join(),
      ).toMatch(/cannot read the prompt/);
      expect(
        checkIssues('groups-choice', params, {
          ...swapped,
          prompt: { big: '2 groups of 2' },
        }).join(),
      ).toMatch(/does not fit/);
      expect(checkIssues('groups-choice', { maxGroups: 3, maxSize: 3 }, swapped).join()).toMatch(
        /does not fit/,
      );
    });

    it('reports options that are not three distinct sums', () => {
      expect(
        checkIssues('groups-choice', params, {
          ...swapped,
          options: swapped.options.slice(0, 2),
        }).join(),
      ).toMatch(/not 3 distinct sums/);
      expect(
        checkIssues(
          'groups-choice',
          params,
          withOptions(swapped, (option) => ({ ...option, big: '4 + 4 + 4' })),
        ).join(),
      ).toMatch(/not 3 distinct sums/);
      expect(
        checkIssues(
          'groups-choice',
          params,
          withOptions(swapped, (option) => ({ ...option, big: '4 + x' })),
        ).join(),
      ).toMatch(/not 3 distinct sums/);
      expect(
        checkIssues(
          'groups-choice',
          params,
          withOptions(swapped, (option) =>
            option.id === 'a' ? { ...option, big: '4 + 4 + 4 + 4 + 4' } : option,
          ),
        ).join(),
      ).toMatch(/not 3 distinct sums/);
    });

    it('reports a missing, a wrong and an invented reason', () => {
      expect(
        checkIssues(
          'groups-choice',
          params,
          withOptions(swapped, ({ id, big }) => ({ id, big })),
        ).join(),
      ).toMatch(/wrong options/);
      expect(
        checkIssues(
          'groups-choice',
          params,
          withOptions(swapped, (option) =>
            option.reason === undefined ? option : { ...option, reason: 'bugs.neighbour' },
          ),
        ).join(),
      ).toMatch(/wrong options/);
      expect(
        checkIssues(
          'groups-choice',
          params,
          withOptions(alike, (option) =>
            option.reason === 'bugs.neighbour' ? { id: option.id, big: option.big } : option,
          ),
        ).join(),
      ).toMatch(/wrong options/);
      expect(
        checkIssues(
          'groups-choice',
          params,
          withOptions(swapped, (option) =>
            option.id === swapped.answer ? { ...option, reason: 'bugs.add-factors' } : option,
          ),
        ).join(),
      ).toMatch(/has a reason/);
    });
  });
});
