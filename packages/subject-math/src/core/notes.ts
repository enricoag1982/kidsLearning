// The Owl bubble's feedback note as data: math's own feedback kinds (`line-wrong`, `pv-wrong`, `array-wrong`) and the wording of
// their hints, added to the card kit's table (`createCardCore({ notes })`). Texts: `math.notes.*` / `math.hints.*` / `math.pv.*` in
// `content/locales/en/common.yaml`.
import type { CardHint } from '@learn/platform-core/domain/exercise/kinds/cards/def';
import { cardHintText } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import type { NoteEntry, Resolve } from '@learn/platform-core/domain/notes';
import type { ArrayHint } from '../kinds/array/def.ts';
import type { NumberLineHint } from '../kinds/number-line/def.ts';
import type { PlaceValueHint } from '../kinds/place-value/def.ts';
import { placesOf } from '../kinds/place-value/model.ts';

export type MathFeedback =
  | { readonly kind: 'instruction' }
  /** number-line: the marker was checked in the wrong place; `reasonKey` = the reason of that exact value, spoken instead of the
   * default. */
  | { readonly kind: 'line-wrong'; readonly reasonKey?: string }
  /** place-value: a wrong build; `reasonKey` = the reason of that exact value, spoken instead of the default. */
  | { readonly kind: 'pv-wrong'; readonly reasonKey?: string }
  /** array: the wrong shape was checked; `reasonKey` = the reason of that exact shape, spoken instead of the rest; `swapped` = it is
   * the right array turned the other way round (rows and columns exchanged) where the text fixes which is which. */
  | { readonly kind: 'array-wrong'; readonly reasonKey?: string; readonly swapped?: boolean }
  | { readonly kind: 'hint'; readonly hint: MathHintPayload }
  | { readonly kind: 'solved' };

/** The hints of math's own kinds, and the card kit's. */
export type MathHintPayload = CardHint | NumberLineHint | PlaceValueHint | ArrayHint;

type OwnNoteKind = 'line-wrong' | 'pv-wrong' | 'array-wrong';

type NoteFeedback<K extends OwnNoteKind | 'hint'> = Extract<MathFeedback, { readonly kind: K }>;

/** The place hint 3 puts blocks in, for the sentence ("Here are the hundreds."), or `undefined` for a hint without a fill. */
function filledPlace(hint: PlaceValueHint): string | undefined {
  const { fill } = hint;
  if (fill === undefined) return undefined;
  const column = fill.findIndex((count) => count !== 0);
  return placesOf(fill.length)[column];
}

/** The nudge of each `array` hint level (1: rows go across, 2: how many dots a row has, 3: the answer). */
function arrayHintText(r: Resolve, hint: ArrayHint): string {
  if (hint.level === 3) {
    return r('exercise.hint-answer');
  }
  if (hint.level === 2) {
    return hint.cols === undefined
      ? r('cards.hint-look')
      : r('math.hints.array-row-total', { cols: hint.cols });
  }
  return r('math.hints.array-rows');
}

/** The nudge of each `number-line` hint level (1: the middle's number, 2: read every mark, 3: the answer). */
function numberLineHintText(r: Resolve, hint: NumberLineHint): string {
  if (hint.level === 3) {
    return r('exercise.hint-answer');
  }
  if (hint.level === 2) {
    return r('math.hints.line-labels');
  }
  return hint.benchmark === undefined
    ? r('cards.hint-look')
    : r('math.hints.line-benchmark', { benchmark: hint.benchmark });
}

/** The nudge of each place-value hint level: the columns, the numeral, the filled column. */
function placeValueHintText(r: Resolve, hint: PlaceValueHint): string {
  if (hint.level === 1) return r('math.hints.pv-columns');
  if (hint.level === 2) return r('math.hints.pv-numeral');
  const place = filledPlace(hint);
  return place === undefined
    ? r('exercise.hint-answer')
    : r('math.hints.pv-fill', { place: r(`math.pv.plural.${place}`) });
}

/** The nudge of each hint level of math's own kinds; a card kit hint keeps the kit's wording. */
export function mathHintText(r: Resolve, hint: MathHintPayload): string {
  if (hint.kind === 'number-line') {
    return numberLineHintText(r, hint);
  }
  if (hint.kind === 'place-value') {
    return placeValueHintText(r, hint);
  }
  if (hint.kind === 'array') {
    return arrayHintText(r, hint);
  }
  return cardHintText(r, hint);
}

export const MATH_NOTES = {
  'line-wrong': {
    tone: 'attention',
    error: true,
    text: (r, f) => r(f.reasonKey ?? 'math.notes.line-wrong'),
  },
  'pv-wrong': {
    tone: 'attention',
    error: true,
    text: (r, f) => r(f.reasonKey ?? 'math.notes.pv-wrong'),
  },
  'array-wrong': {
    tone: 'attention',
    error: true,
    text: (r, f) =>
      r(
        f.reasonKey ?? (f.swapped === true ? 'math.notes.array-swapped' : 'math.notes.array-wrong'),
      ),
  },
  hint: { tone: 'attention', text: (r, f) => mathHintText(r, f.hint) },
} as const satisfies { readonly [K in OwnNoteKind | 'hint']: NoteEntry<NoteFeedback<K>> };
