/**
 * Card-kit fixtures for tests (`@learn/platform-core/testing`, never the app bundle): one sample def per kind and drivers
 * that play a def with its own kind's `solution()` / `wrongAction()`.
 */
import { CARD_KINDS, cardKindOf } from '../domain/exercise/kinds/cards/kinds.ts';
import type {
  CardAction,
  CardChoiceDef,
  CardDefOf,
  CardExerciseDef,
  CardState,
  CardType,
} from '../domain/exercise/kinds/cards/def.ts';
import { cardSolutionOf } from '../domain/exercise/kinds/cards/solutions.ts';
import type { NumberEntryDef } from '../domain/exercise/kinds/number-entry/def.ts';
import type { OrderDef } from '../domain/exercise/kinds/order/def.ts';
import type { TrueFalseDef } from '../domain/exercise/kinds/true-false/def.ts';

const choice: CardChoiceDef = {
  id: 'cc1',
  concept: 'counting',
  textKey: 'lessons:cc1',
  prompt: { emoji: '🍎🍎🍎' },
  type: 'choice',
  options: [
    { id: 'a', big: '2' },
    { id: 'b', big: '3' },
    { id: 'c', textKey: 'lessons:cc1.five', emoji: '🖐️' },
  ],
  answer: 'b',
};

const trueFalse: TrueFalseDef = {
  id: 'ct1',
  concept: 'counting',
  textKey: 'lessons:ct1',
  prompt: { big: '2 + 2 = 4' },
  type: 'true-false',
  answer: true,
};

const numberEntry: NumberEntryDef = {
  id: 'cn1',
  concept: 'counting',
  textKey: 'lessons:cn1',
  prompt: { big: '7 + 5' },
  type: 'number-entry',
  answer: 12,
  maxDigits: 2,
};

const order: OrderDef = {
  id: 'co1',
  concept: 'counting',
  textKey: 'lessons:co1',
  prompt: { emoji: '🔢' },
  type: 'order',
  items: [
    { id: 'three', big: '3' },
    { id: 'one', big: '1' },
    { id: 'two', textKey: 'lessons:co1.two', big: '2' },
  ],
  answer: ['one', 'two', 'three'],
};

/** One valid def of each card kind. */
export const CARD_SAMPLES = {
  choice,
  'true-false': trueFalse,
  'number-entry': numberEntry,
  order,
} as const satisfies { readonly [T in CardType]: CardDefOf<T> };

/** The kind's own `act` folded over `actions`, from `from` (default a fresh state). */
export function playCard(
  def: CardExerciseDef,
  actions: readonly CardAction[],
  from: CardState = cardKindOf(def).init(def),
): CardState {
  const kind = cardKindOf(def);
  return actions.reduce((state, action) => kind.act(state, action, null).state, from);
}

/** `def`'s `solution()` from a fresh state. */
export function playCardSolution(def: CardExerciseDef): CardState {
  return playCard(def, cardSolutionOf(def).solution(def, null));
}

/** `def`'s `wrongAction()`, then its `solution()`: a wrong try costs exactly 1 error and never blocks solving. */
export function playCardWrongThenSolve(def: CardExerciseDef): CardState {
  const solution = cardSolutionOf(def);
  const afterWrong = playCard(def, solution.wrongAction?.(def, null) ?? []);
  return playCard(def, solution.solution(def, null), afterWrong);
}

/** Stars earned so far; `0` until solved. */
export function cardStars(state: CardState): 0 | 1 | 2 | 3 {
  return state.solved ? cardKindOf(state.def).stars(state) : 0;
}

/** Every kind's id: the registry's keys. */
export const CARD_TYPES = Object.keys(CARD_KINDS) as readonly CardType[];
