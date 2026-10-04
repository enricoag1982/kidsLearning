// pv-build, pv-read, pv-which, pv-expanded over 1 000 seeds per parameter combination of curriculum §2: each item is solved again here
// from its English sentence / its card (not through the template's own check), and every `check` fails on a hand-broken item.
import { describe, expect, it } from 'vitest';
import type { ChoiceItem, NumberEntryItem, PlaceValueItem } from './items.ts';
import { checkIssues, draw, overSeeds, sample } from './testing.ts';

const DIGITS = [3, 4] as const;
const ZEROS = ['none', 'tens', 'ones'] as const;
const COMBOS = DIGITS.flatMap((digits) => ZEROS.map((zeroIn) => ({ digits, zeroIn })));

/** The places of a number as text, high to low. */
function places(n: number, digits: number): readonly number[] {
  return Array.from(
    { length: digits },
    (_unused, i) => Math.floor(n / 10 ** (digits - 1 - i)) % 10,
  );
}

/** Zeros only where `zeroIn` puts one. */
function zeroProblems(n: number, digits: number, zeroIn: string): string[] {
  const zeroAt = zeroIn === 'tens' ? digits - 2 : zeroIn === 'ones' ? digits - 1 : -1;
  return places(n, digits).flatMap((digit, i) =>
    (digit === 0) === (i === zeroAt)
      ? []
      : [`${String(n)}: digit ${String(i)} is ${String(digit)} (zeroIn ${zeroIn})`],
  );
}

/** The tens and ones exchanged, by arithmetic. */
const swapped = (n: number): number => n - (n % 100) + (n % 10) * 10 + (Math.floor(n / 10) % 10);

/** `th h t o` read back from "1 thousands, 2 hundreds, 0 tens and 5 ones" (3-digit sentences have no thousands). */
function readSentence(text: string): readonly number[] | null {
  const [, thousands, hundreds, tens, ones] =
    /^(?:Which number has |)(?:(\d) thousands, )?(\d) hundreds, (\d) tens and (\d) ones(?:\. What number is it)?[?.]$/.exec(
      text,
    ) ?? [];
  if (hundreds === undefined || tens === undefined || ones === undefined) return null;
  return [
    ...(thousands === undefined ? [] : [Number(thousands)]),
    Number(hundreds),
    Number(tens),
    Number(ones),
  ];
}

describe('pv-build', () => {
  describe.each(COMBOS)('digits $digits, zeroIn $zeroIn', ({ digits, zeroIn }) => {
    it('builds a clean item over 1 000 seeds: the sentence, the card and the target agree, zeros as asked, swap reason when tens and ones differ', () => {
      const { problems, items } = overSeeds<PlaceValueItem>(
        'pv-build',
        { digits, zeroIn },
        ({ item, text }) => {
          const found = /^Build (\d+) with blocks\.$/.exec(text);
          const n = Number(found?.[1]);
          const swap = swapped(n);
          const reasons = item.reasons ?? [];
          return [
            ...(found === null ? [`${item.id}: "${text}" is not the build sentence`] : []),
            ...(item.target === n && item.prompt.big === String(n)
              ? []
              : [
                  `${item.id}: target ${String(item.target)} / big ${item.prompt.big} is not ${String(n)}`,
                ]),
            ...(item.columns === digits && String(n).length === digits
              ? []
              : [`${item.id}: ${String(n)} in ${String(item.columns)} columns`]),
            ...zeroProblems(n, digits, zeroIn),
            ...(swap === n
              ? reasons.length === 0
                ? []
                : [`${item.id}: a reason for tens = ones`]
              : JSON.stringify(reasons) === JSON.stringify([{ value: swap, text: 'bugs.swap' }])
                ? []
                : [`${item.id}: reasons ${JSON.stringify(reasons)} for ${String(n)}`]),
            ...(reasons.some((reason) => reason.value === n)
              ? [`${item.id}: reason equals the target`]
              : []),
          ];
        },
      );
      expect(problems).toEqual([]);
      expect(items).toHaveLength(1000);
      // The seeds reach nearly every number there is (81 with a zero place in 3 digits), not a handful.
      expect(new Set(items.map(({ item }) => item.target)).size).toBeGreaterThan(
        digits === 3 && zeroIn !== 'none' ? 75 : 300,
      );
    });
  });

  it('builds the fixed targets of `values` in order, whatever their zeros', () => {
    const { drawn, issues } = draw<PlaceValueItem>(
      'pv-build',
      { digits: 3, values: [243, 305] },
      0,
      2,
    );
    expect(issues).toEqual([]);
    expect(drawn.map(({ item }) => item.target)).toEqual([243, 305]);
    expect(drawn.map(({ item }) => item.reasons)).toEqual([
      [{ value: 234, text: 'bugs.swap' }],
      [{ value: 350, text: 'bugs.swap' }],
    ]);
    expect(drawn.map(({ text }) => text)).toEqual([
      'Build 243 with blocks.',
      'Build 305 with blocks.',
    ]);
  });

  it('names its params problems: a value of the wrong width, too few values, an unknown digit count or zero place', () => {
    expect(draw('pv-build', { digits: 3, values: [24] }, 0).issues.join('\n')).toMatch(
      /values.*24 is not a 3-digit number/,
    );
    expect(draw('pv-build', { digits: 3, values: [243] }, 0, 2).issues.join('\n')).toMatch(
      /values has 1 entries, item 2 has none/,
    );
    expect(draw('pv-build', { digits: 5 }, 0).issues).not.toEqual([]);
    expect(draw('pv-build', { digits: 3, zeroIn: 'hundreds' }, 0).issues).not.toEqual([]);
    expect(draw('pv-build', { digits: 3, extra: true }, 0).issues).not.toEqual([]);
  });

  it('draws 3 distinct items per entry for every combination', () => {
    for (const params of COMBOS) {
      for (let seed = 0; seed < 50; seed += 1) {
        const { drawn, issues } = draw<PlaceValueItem>('pv-build', params, seed, 3);
        expect(issues, `${JSON.stringify(params)} @${String(seed)}`).toEqual([]);
        expect(new Set(drawn.map(({ item }) => item.target)).size).toBe(3);
      }
    }
  });

  describe('check', () => {
    const params = { digits: 3, zeroIn: 'none' };
    const good = sample<PlaceValueItem>('pv-build', params, (item) => item.reasons !== undefined);

    it('accepts a good item', () => {
      expect(checkIssues('pv-build', params, good)).toEqual([]);
    });

    it('reports a prompt that is not the target, an unreadable prompt, a wrong column count', () => {
      expect(checkIssues('pv-build', params, { ...good, target: good.target + 1 }).join()).toMatch(
        /prompt shows/,
      );
      expect(checkIssues('pv-build', params, { ...good, prompt: { big: '3 05' } }).join()).toMatch(
        /cannot read the prompt/,
      );
      expect(checkIssues('pv-build', params, { ...good, columns: 4 }).join()).toMatch(/4 columns/);
    });

    it('reports a zero that the params do not allow, and a target outside `values`', () => {
      const zero = {
        ...good,
        target: 305,
        prompt: { big: '305' },
        reasons: [{ value: 350, text: 'bugs.swap' }],
      };
      expect(checkIssues('pv-build', params, zero).join()).toMatch(/zeros rule/);
      expect(
        checkIssues('pv-build', { digits: 3, values: [243] }, { ...zero, target: 305 }).join(),
      ).toMatch(/zeros rule \(values\)/);
    });

    it('reports a missing, a wrong, an extra reason', () => {
      const bare = { ...good, reasons: undefined };
      expect(checkIssues('pv-build', params, bare).join()).toMatch(/reasons .* should be/);
      expect(
        checkIssues('pv-build', params, {
          ...good,
          reasons: [{ value: good.target + 1, text: 'bugs.swap' }],
        }).join(),
      ).toMatch(/reasons/);
      const alike = sample<PlaceValueItem>(
        'pv-build',
        params,
        (item) => item.reasons === undefined,
      );
      expect(
        checkIssues('pv-build', params, {
          ...alike,
          reasons: [{ value: 123, text: 'bugs.swap' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});

describe('pv-read', () => {
  describe.each(COMBOS)('digits $digits, zeroIn $zeroIn', ({ digits, zeroIn }) => {
    it('asks for the number of the sentence: the card, the answer, a pad one digit wider and the reasons agree', () => {
      const { problems, items } = overSeeds<NumberEntryItem>(
        'pv-read',
        { digits, zeroIn },
        ({ item, text }) => {
          const read = readSentence(text);
          if (read === null) return [`${item.id}: "${text}" is not the reading sentence`];
          const n = read.reduce((sum, digit) => sum * 10 + digit, 0);
          const labels = digits === 3 ? ['H', 'T', 'O'] : ['Th', 'H', 'T', 'O'];
          const code = read.map((digit, i) => `${String(digit)}${labels[i] ?? '?'}`).join(' ');
          const reasons = item.reasons ?? [];
          const [h, t, o] = read.slice(-3);
          // 2 H 0 T 5 O written as 200 and 5 → 2005 (3 digits, zero tens only: any other append is wider than the pad).
          const append =
            digits === 3 && t === 0
              ? [{ value: Number(`${String(h)}00${String(o)}`), text: 'bugs.append' }]
              : [];
          const swap = t === o ? [] : [{ value: swapped(n), text: 'bugs.swap' }];
          const wanted = [...swap, ...append].sort((x, y) => x.value - y.value);
          return [
            ...(read.length === digits ? [] : [`${item.id}: ${String(read.length)} places`]),
            ...(item.answer === n
              ? []
              : [`${item.id}: answer ${String(item.answer)} is not ${String(n)}`]),
            ...(item.prompt.big === code
              ? []
              : [`${item.id}: "${item.prompt.big}" is not "${code}"`]),
            ...(item.maxDigits === digits + 1
              ? []
              : [`${item.id}: maxDigits ${String(item.maxDigits)}`]),
            ...zeroProblems(n, digits, zeroIn),
            ...(JSON.stringify([...reasons].sort((x, y) => x.value - y.value)) ===
            JSON.stringify(wanted)
              ? []
              : [`${item.id}: reasons ${JSON.stringify(reasons)} for ${String(n)}`]),
            ...reasons.flatMap((reason) =>
              String(reason.value).length > digits + 1 || reason.value === n
                ? [`${item.id}: reason ${String(reason.value)} does not fit`]
                : [],
            ),
          ];
        },
      );
      expect(problems).toEqual([]);
      expect(items).toHaveLength(1000);
    });
  });

  it('speaks 205 → 2005 (append) and 250 (swap) for a zero in the tens, as the curriculum says', () => {
    const item = sample<NumberEntryItem>(
      'pv-read',
      { digits: 3, zeroIn: 'tens' },
      (found) => found.answer === 705,
    );
    expect(item.reasons).toEqual([
      { value: 750, text: 'bugs.swap' },
      { value: 7005, text: 'bugs.append' },
    ]);
  });

  describe('check', () => {
    const params = { digits: 3, zeroIn: 'tens' };
    const good = sample<NumberEntryItem>('pv-read', params);

    it('accepts a good item', () => {
      expect(checkIssues('pv-read', params, good)).toEqual([]);
    });

    it('reports an answer that is not what the card says, an unreadable card, a pad of the wrong width', () => {
      expect(checkIssues('pv-read', params, { ...good, answer: good.answer + 1 }).join()).toMatch(
        /not \d+/,
      );
      expect(checkIssues('pv-read', params, { ...good, prompt: { big: '2H 0T' } }).join()).toMatch(
        /cannot read the prompt/,
      );
      expect(checkIssues('pv-read', params, { ...good, maxDigits: 3 }).join()).toMatch(
        /maxDigits 3 should be 4/,
      );
    });

    it('reports a card that breaks the zeros / digits params', () => {
      expect(checkIssues('pv-read', { digits: 3, zeroIn: 'ones' }, good).join()).toMatch(
        /zeros ones/,
      );
      expect(checkIssues('pv-read', { digits: 4, zeroIn: 'tens' }, good).join()).toMatch(/4-digit/);
    });

    it('reports a missing append, a missing swap and an invented reason', () => {
      expect(
        checkIssues('pv-read', params, { ...good, reasons: good.reasons?.slice(0, 1) }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('pv-read', params, { ...good, reasons: good.reasons?.slice(1) }).join(),
      ).toMatch(/reasons/);
      expect(
        checkIssues('pv-read', params, {
          ...good,
          reasons: [...(good.reasons ?? []), { value: 1, text: 'bugs.swap' }],
        }).join(),
      ).toMatch(/reasons/);
    });
  });
});

describe('pv-which', () => {
  describe.each(COMBOS)('digits $digits, zeroIn $zeroIn', ({ digits, zeroIn }) => {
    it('has exactly one option with the sentence’s number, two distinct wrong numerals with their reasons, shuffled', () => {
      const { problems, items } = overSeeds<ChoiceItem>(
        'pv-which',
        { digits, zeroIn },
        ({ item, text }) => {
          const read = readSentence(text);
          if (read === null) return [`${item.id}: "${text}" is not the pick sentence`];
          const n = read.reduce((sum, digit) => sum * 10 + digit, 0);
          const shown = item.options.map((option) => Number(option.big.replaceAll(' ', '')));
          const right = item.options.filter((_option, i) => shown[i] === n);
          const wrong = item.options.filter((_option, i) => shown[i] !== n);
          const [h, t, o] = read.slice(-3);
          return [
            ...(read.length === digits ? [] : [`${item.id}: ${String(read.length)} places`]),
            ...(item.options.length === 3 && new Set(shown).size === 3
              ? []
              : [`${item.id}: options ${shown.join(', ')} are not 3 distinct numbers`]),
            ...(right.length === 1 && right[0]?.id === item.answer && right[0].reason === undefined
              ? []
              : [`${item.id}: the right option is not unique / has a reason`]),
            ...(wrong.every(
              (option) => option.reason === 'bugs.swap' || option.reason === 'bugs.append',
            )
              ? []
              : [`${item.id}: a wrong option has no reason`]),
            ...(shown.includes(swapped(n))
              ? []
              : [`${item.id}: no tens / ones swap among ${shown.join(', ')}`]),
            // 2 H 0 T 5 O: 2005 is a distractor wherever the result stays within 5 digits (3 digits with a zero in the tens or ones).
            ...(digits === 3 && t === 0 && !shown.includes(Number(`${String(h)}00${String(o)}`))
              ? [`${item.id}: no 2005-style option among ${shown.join(', ')}`]
              : []),
            ...(digits === 3 && o === 0 && !shown.includes(Number(`${String(h)}00${String(t)}0`))
              ? [`${item.id}: no 20030-style option among ${shown.join(', ')}`]
              : []),
            ...(item.options.every((option) => option.big.length <= 16)
              ? []
              : [`${item.id}: wide option`]),
            ...zeroProblems(n, digits, zeroIn),
          ];
        },
      );
      expect(problems).toEqual([]);
      // The answer moves between the three places (the order is shuffled).
      const at = new Set(items.map(({ item }) => item.answer));
      expect([...at].sort()).toEqual(['a', 'b', 'c']);
    });
  });

  it('shows a hundreds / tens swap in place of append when no place is zero, and in the 4-digit zero cases', () => {
    const none = sample<ChoiceItem>('pv-which', { digits: 3, zeroIn: 'none' });
    expect(
      none.options.filter((option) => option.reason !== undefined).map((option) => option.reason),
    ).toEqual(['bugs.swap', 'bugs.swap']);
    const four = sample<ChoiceItem>('pv-which', { digits: 4, zeroIn: 'tens' });
    expect(four.options.every((option) => option.reason !== 'bugs.append')).toBe(true);
  });

  describe('check', () => {
    const params = { digits: 3, zeroIn: 'tens' };
    const good = sample<ChoiceItem>('pv-which', params);
    const wrongId = good.options.find((option) => option.id !== good.answer)?.id ?? '';

    it('accepts a good item', () => {
      expect(checkIssues('pv-which', params, good)).toEqual([]);
    });

    it('reports an answer on a wrong option, a duplicate numeral, an unreadable card', () => {
      expect(checkIssues('pv-which', params, { ...good, answer: wrongId }).join()).toMatch(
        /exactly the option/,
      );
      const dup = {
        ...good,
        options: good.options.map((option, i) =>
          i === 0 ? { ...option, big: good.options[1]?.big ?? '' } : option,
        ),
      };
      expect(checkIssues('pv-which', params, dup).join()).toMatch(/not 3 distinct numerals/);
      expect(checkIssues('pv-which', params, { ...good, prompt: { big: 'x' } }).join()).toMatch(
        /cannot read the prompt/,
      );
      expect(
        checkIssues('pv-which', params, { ...good, options: good.options.slice(0, 2) }).join(),
      ).toMatch(/not 3 distinct numerals/);
    });

    it('reports a reason on the right option or a distractor without its reason', () => {
      const onRight = {
        ...good,
        options: good.options.map((option) =>
          option.id === good.answer ? { ...option, reason: 'bugs.swap' } : option,
        ),
      };
      expect(checkIssues('pv-which', params, onRight).join()).toMatch(/has a reason/);
      const bare = {
        ...good,
        options: good.options.map(({ id, big }) => ({ id, big })),
      };
      expect(checkIssues('pv-which', params, bare).join()).toMatch(/wrong options/);
    });
  });
});

describe('pv-expanded', () => {
  for (const digits of DIGITS) {
    describe(`digits ${String(digits)}`, () => {
      it('sums the parts to the answer, has exactly one zero place after the first, and drop-zero is a shorter number', () => {
        const { problems, items } = overSeeds<NumberEntryItem>(
          'pv-expanded',
          { digits },
          ({ item, text }) => {
            const parts = item.prompt.big.split(' + ').map(Number);
            const sum = parts.reduce((total, part) => total + part, 0);
            const zeros = String(item.answer).split('0').length - 1;
            const reasons = item.reasons ?? [];
            return [
              ...(text === 'Put the parts together. What number is it?'
                ? []
                : [`${item.id}: text "${text}"`]),
              ...(sum === item.answer
                ? []
                : [`${item.id}: ${item.prompt.big} is ${String(sum)}, not ${String(item.answer)}`]),
              ...(String(item.answer).length === digits &&
              String(item.answer)[0] !== '0' &&
              zeros === 1 &&
              !String(item.answer).startsWith('0')
                ? []
                : [`${item.id}: ${String(item.answer)} zeros`]),
              ...(parts.length === digits - 1 &&
              parts.every((part) => /^[1-9]0*$/.test(String(part)))
                ? []
                : [`${item.id}: parts ${item.prompt.big}`]),
              ...(reasons.length === 1 &&
              reasons[0]?.text === 'bugs.drop-zero' &&
              reasons[0].value === Number(String(item.answer).replace('0', '')) &&
              String(reasons[0].value).length === digits - 1
                ? []
                : [`${item.id}: reasons ${JSON.stringify(reasons)}`]),
              ...(item.prompt.big.length <= 16 ? [] : [`${item.id}: wide prompt`]),
            ];
          },
        );
        expect(problems).toEqual([]);
        // The zero visits every non-leading place.
        const zeroPlaces = new Set(items.map(({ item }) => String(item.answer).indexOf('0')));
        expect([...zeroPlaces].sort()).toEqual(digits === 3 ? [1, 2] : [1, 2, 3]);
      });
    });
  }

  it('accepts the curriculum example: 3000 + 400 + 5 is 3405, and dropping the zero gives 345', () => {
    const example: NumberEntryItem = {
      id: 'dr-1',
      type: 'number-entry',
      text: 'gen.dr-1.text',
      prompt: { big: '3000 + 400 + 5' },
      answer: 3405,
      reasons: [{ value: 345, text: 'bugs.drop-zero' }],
    };
    expect(checkIssues('pv-expanded', { digits: 4 }, example)).toEqual([]);
  });

  describe('check', () => {
    const params = { digits: 4 };
    const good = sample<NumberEntryItem>('pv-expanded', params);

    it('accepts a good item', () => {
      expect(checkIssues('pv-expanded', params, good)).toEqual([]);
    });

    it('reports a wrong sum, parts that are not place values or not highest first', () => {
      expect(
        checkIssues('pv-expanded', params, { ...good, answer: good.answer + 1 }).join(),
      ).toMatch(/not \d+/);
      expect(
        checkIssues('pv-expanded', params, { ...good, prompt: { big: '3400 + 5' } }).join(),
      ).toMatch(/not a sum of place values/);
      expect(
        checkIssues('pv-expanded', params, { ...good, prompt: { big: '300 + 4000' } }).join(),
      ).toMatch(/highest first/);
      expect(
        checkIssues('pv-expanded', params, { ...good, prompt: { big: '33 + 4' } }).join(),
      ).toMatch(/not a sum of place values/);
    });

    it('reports a number without a zero place, with two, or of the wrong width, and a wrong drop-zero reason', () => {
      expect(
        checkIssues('pv-expanded', params, {
          ...good,
          prompt: { big: '3000 + 400 + 50 + 5' },
          answer: 3455,
        }).join(),
      ).toMatch(/exactly one zero place/);
      expect(checkIssues('pv-expanded', { digits: 3 }, good).join()).toMatch(/3-digit/);
      expect(
        checkIssues('pv-expanded', params, {
          ...good,
          reasons: [{ value: good.answer + 1, text: 'bugs.drop-zero' }],
        }).join(),
      ).toMatch(/reasons/);
      expect(checkIssues('pv-expanded', params, { ...good, reasons: undefined }).join()).toMatch(
        /reasons/,
      );
    });
  });
});
