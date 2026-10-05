// `groups` and `groups-choice` over 1 000 seeds per parameter combination: each item is solved again here from its English sentence and
// card, the picture (k clusters of n shapes) is read back from the card's shape tokens, and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { GroupCluster, GroupsChoiceItem, PictureNumberEntryItem } from './items.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

/** `k` clusters of `n` red circles: a hand-made picture of "k groups of n". */
const clustersOf = (k: number, n: number): GroupCluster[] =>
  Array.from({ length: k }, () => ({ kind: 'circle', colour: 'red', count: n }));

/** What the picture shows, read from the tokens alone: `[k, n]` when it is k clusters that all hold n, one kind and one colour. */
function readPicture(shapes: readonly GroupCluster[]): readonly [number, number] | null {
  const first = shapes[0];
  return first !== undefined &&
    shapes.every(
      (cluster) =>
        cluster.count === first.count &&
        cluster.kind === first.kind &&
        cluster.colour === first.colour,
    )
    ? [shapes.length, first.count]
    : null;
}

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
            ...(readPicture(item.prompt.shapes)?.join() === `${String(k)},${String(n)}`
              ? []
              : [
                  `${item.id}: the picture ${JSON.stringify(item.prompt.shapes)} is not ${item.prompt.big}`,
                ]),
            ...(Object.keys(item.prompt).join() === 'big,shapes' && !('emoji' in item.prompt)
              ? []
              : [`${item.id}: prompt fields ${Object.keys(item.prompt).join()}`]),
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
    const picturesOf = (seed: number): [string, string][] =>
      draw<PictureNumberEntryItem>('groups', { maxGroups: 4, maxSize: 4 }, seed, 12).drawn.map(
        ({ item }) => [item.prompt.big, JSON.stringify(item.prompt.shapes)],
      );
    const bigToPicture = new Map<string, string>();
    for (let seed = 0; seed < 30; seed += 1) {
      for (const [big, picture] of picturesOf(seed)) {
        expect(bigToPicture.get(big) ?? picture, big).toBe(picture);
        bigToPicture.set(big, picture);
      }
    }
    expect(bigToPicture.size).toBe(3 * 3);
  });

  it('keeps every number of the entries it drew before the pictures (the same seed draws the same k and n)', () => {
    // Drawn by the template before it drew pictures, with the seeds of the shipped lesson `mt-groups`.
    const bigs = (params: unknown, seed: number, count: number): string[] =>
      draw<PictureNumberEntryItem>('groups', params, seed, count).drawn.map(
        ({ item }) => item.prompt.big,
      );
    expect(bigs({ maxGroups: 3, maxSize: 3 }, 1, 1)).toEqual(['3 groups of 2']);
    expect(bigs({ maxGroups: 4, maxSize: 4 }, 32, 2)).toEqual(['3 groups of 4', '2 groups of 4']);
    expect(bigs({ maxGroups: 5, maxSize: 5 }, 5, 1)).toEqual(['4 groups of 5']);
  });

  it('draws groups of up to 9 and up to 5 groups, every one inside the 8-token row, and keeps one kind and colour per item', () => {
    const { problems, items } = overSeeds<PictureNumberEntryItem>(
      'groups',
      { maxGroups: 5, maxSize: 9 },
      ({ item }) => {
        const picture = readPicture(item.prompt.shapes);
        return picture !== null && picture[0] <= 5 && picture[1] <= 9
          ? []
          : [`${item.id}: picture`];
      },
    );
    expect(problems).toEqual([]);
    const counts = new Set(items.flatMap(({ item }) => item.prompt.shapes.map((c) => c.count)));
    expect([...counts].sort()).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    const looks = new Set(
      items.map(
        ({ item }) => `${item.prompt.shapes[0]?.kind ?? ''} ${item.prompt.shapes[0]?.colour ?? ''}`,
      ),
    );
    expect(looks.size).toBeGreaterThan(10);
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
      prompt: { big, shapes: clustersOf(Number(big.split(' ')[0]), Number(big.split(' ')[3])) },
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
    // A cluster holds 9 shapes at most, the prompt row 8 clusters, the curriculum 5 groups.
    expect(draw('groups', { maxGroups: 3, maxSize: 9 }, 0).issues).toEqual([]);
    expect(draw('groups', { maxGroups: 3, maxSize: 10 }, 0).issues).not.toEqual([]);
    expect(draw('groups', { maxGroups: 6, maxSize: 3 }, 0).issues).not.toEqual([]);
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
        checkIssues('groups', params, { ...plain, prompt: { ...plain.prompt, shapes: [] } }).join(),
      ).toMatch(/picture/);
    });

    it('reports a picture that does not match the card: too few groups, a group of another size, mixed kinds or colours', () => {
      const [k, n] = readPicture(plain.prompt.shapes) ?? [0, 0];
      const first = plain.prompt.shapes[0] ?? { kind: 'circle', colour: 'red', count: n };
      const picture = (shapes: readonly GroupCluster[]): string =>
        checkIssues('groups', params, { ...plain, prompt: { ...plain.prompt, shapes } }).join();
      expect(picture(clustersOf(k, n))).not.toMatch(/the picture shows/);
      expect(picture(clustersOf(k - 1, n))).toMatch(/the picture shows/);
      expect(picture(clustersOf(k + 1, n))).toMatch(/the picture shows/);
      expect(picture(clustersOf(k, n + 1))).toMatch(/the picture shows/);
      expect(picture([...plain.prompt.shapes.slice(1), { ...first, count: n + 1 }])).toMatch(
        /the picture shows/,
      );
      const otherKind = first.kind === 'star' ? 'heart' : 'star';
      const otherColour = first.colour === 'blue' ? 'red' : 'blue';
      expect(picture([...plain.prompt.shapes.slice(1), { ...first, kind: otherKind }])).toMatch(
        /one kind and one colour/,
      );
      expect(picture([...plain.prompt.shapes.slice(1), { ...first, colour: otherColour }])).toMatch(
        /one kind and one colour/,
      );
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
      const { problems, items } = overSeeds<GroupsChoiceItem>(
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
            ...(item.prompt.big === `${String(k)} groups of ${String(n)}`
              ? []
              : [`${item.id}: card ${item.prompt.big}`]),
            ...(readPicture(item.prompt.shapes ?? [])?.join() === `${String(k)},${String(n)}`
              ? []
              : [
                  `${item.id}: the picture ${JSON.stringify(item.prompt.shapes)} is not ${item.prompt.big}`,
                ]),
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
    const item: GroupsChoiceItem = {
      id: 'dr-1',
      type: 'choice',
      text: 'gen.dr-1.text',
      prompt: { big: '3 groups of 4', shapes: clustersOf(3, 4) },
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
    const swapped = sample<GroupsChoiceItem>(
      'groups-choice',
      params,
      (item) => item.prompt.big === '3 groups of 4',
    );
    const alike = sample<GroupsChoiceItem>(
      'groups-choice',
      params,
      (item) => item.prompt.big === '3 groups of 3',
    );
    const withOptions = (
      item: GroupsChoiceItem,
      edit: (option: GroupsChoiceItem['options'][number]) => GroupsChoiceItem['options'][number],
    ): GroupsChoiceItem => ({
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
        checkIssues('groups-choice', params, {
          ...swapped,
          prompt: { ...swapped.prompt, big: '3 × 4' },
        }).join(),
      ).toMatch(/cannot read the prompt/);
      expect(
        checkIssues('groups-choice', params, {
          ...swapped,
          prompt: { ...swapped.prompt, big: '2 groups of 2' },
        }).join(),
      ).toMatch(/does not fit/);
      expect(checkIssues('groups-choice', { maxGroups: 3, maxSize: 3 }, swapped).join()).toMatch(
        /does not fit/,
      );
    });

    it('reports a picture that does not match the card', () => {
      const picture = (item: GroupsChoiceItem, shapes: readonly GroupCluster[]): string =>
        checkIssues('groups-choice', params, {
          ...item,
          prompt: { ...item.prompt, shapes },
        }).join();
      const drawn = swapped.prompt.shapes ?? [];
      expect(drawn).toHaveLength(3);
      expect(picture(swapped, drawn)).toBe('');
      expect(picture(swapped, [])).toMatch(/the picture shows/);
      expect(picture(swapped, clustersOf(4, 3))).toMatch(/the picture shows/);
      expect(picture(swapped, clustersOf(3, 3))).toMatch(/the picture shows/);
      expect(
        picture(swapped, [...drawn.slice(1), { kind: 'star', colour: 'red', count: 4 }]),
      ).toMatch(/one kind and one colour/);
      // No picture at all is a picture of nothing, unless the entry says `picture: false`.
      expect(
        checkIssues('groups-choice', params, {
          ...swapped,
          prompt: { big: swapped.prompt.big },
        }).join(),
      ).toMatch(/the picture shows/);
    });

    it('with `picture: false` draws the card as words only, with the same numbers and options as with the picture', () => {
      const draws = (picture: boolean): GroupsChoiceItem[] =>
        Array.from(
          { length: 40 },
          (_unused, seed) =>
            draw<GroupsChoiceItem>('groups-choice', { maxGroups: 4, maxSize: 4, picture }, seed, 2)
              .drawn,
        ).flatMap((drawn) => drawn.map(({ item }) => item));
      const [plain, pictured] = [draws(false), draws(true)];
      expect(plain.length).toBe(pictured.length);
      for (const [index, item] of plain.entries()) {
        expect(Object.keys(item.prompt), item.id).toEqual(['big']);
        expect({ ...item, prompt: undefined }, item.id).toEqual({
          ...pictured[index],
          prompt: undefined,
        });
        expect(item.prompt.big, item.id).toBe(pictured[index]?.prompt.big);
        expect(pictured[index]?.prompt.shapes?.length, item.id).toBeGreaterThan(1);
      }
      expect(
        draw('groups-choice', { maxGroups: 4, maxSize: 4, picture: 'no' }, 0).issues,
      ).not.toEqual([]);
      const flat = plain[0];
      if (flat === undefined) throw new Error('no item');
      expect(
        checkIssues('groups-choice', { maxGroups: 4, maxSize: 4, picture: false }, flat),
      ).toEqual([]);
      expect(
        checkIssues(
          'groups-choice',
          { maxGroups: 4, maxSize: 4, picture: false },
          {
            ...flat,
            prompt: { ...flat.prompt, shapes: clustersOf(2, 2) },
          },
        ).join(),
      ).toMatch(/symbols only/);
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
