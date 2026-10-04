import type { OrderHint, OrderOutcome, OrderState } from './def.ts';

interface Step<S> {
  readonly state: S;
  readonly outcome: OrderOutcome;
}

/** The id the kid has to tap next, or `undefined` once everything is placed. */
export function nextItemId(state: OrderState): string | undefined {
  return state.def.answer[state.placed.length];
}

/** Appends `itemId` (the right next one): clears the wrong flash and the ruled-out marks, solved with the last. */
function place<S extends OrderState>(state: S, itemId: string): S {
  const placed = [...state.placed, itemId];
  return {
    ...state,
    placed,
    ruledOut: [],
    wrongItemId: undefined,
    solved: placed.length === state.def.answer.length,
  };
}

/** The next right card → placed (solved with the last one); another card → errors + 1 and `wrongItemId`, nothing placed.
 * An id already placed, one that is not an item, or any tap once solved is ignored. */
export function placeItem<S extends OrderState>(state: S, itemId: string): Step<S> {
  const known = state.def.items.some((item) => item.id === itemId);
  if (state.solved || !known || state.placed.includes(itemId)) {
    return { state, outcome: { kind: 'ignored' } };
  }
  if (itemId === nextItemId(state)) {
    const next = { ...place(state, itemId), moves: state.moves + 1 };
    return { state: next, outcome: { kind: next.solved ? 'solved' : 'placed' } };
  }
  return {
    state: { ...state, errors: state.errors + 1, moves: state.moves + 1, wrongItemId: itemId },
    outcome: { kind: 'wrong', itemId },
  };
}

/** 1: flags the next slot; 2: rules out the first card (display order) that is neither placed, ruled out nor the next one;
 * 3: places the next right card. `level` is already on `state.hintLevel`. A hint clears the last wrong flash. */
export function orderHint<S extends OrderState>(
  state: S,
  level: 1 | 2 | 3,
): { readonly state: S; readonly hint: OrderHint } {
  const nextSlot = state.placed.length;
  const next = nextItemId(state);
  const calm: S = { ...state, wrongItemId: undefined };
  if (level === 3) {
    return next === undefined
      ? { state: calm, hint: { kind: 'order', level, reveal: true, nextSlot } }
      : {
          state: place(calm, next),
          hint: { kind: 'order', level, reveal: true, nextSlot, placedId: next },
        };
  }
  if (level === 2) {
    const ruledOutId = state.def.items
      .map((item) => item.id)
      .find((id) => id !== next && !state.placed.includes(id) && !state.ruledOut.includes(id));
    return {
      state:
        ruledOutId === undefined ? calm : { ...calm, ruledOut: [...state.ruledOut, ruledOutId] },
      hint: {
        kind: 'order',
        level,
        reveal: false,
        nextSlot,
        ...(ruledOutId === undefined ? {} : { ruledOutId }),
      },
    };
  }
  return { state: calm, hint: { kind: 'order', level, reveal: false, nextSlot } };
}
