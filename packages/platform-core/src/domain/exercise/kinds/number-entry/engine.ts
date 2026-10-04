import type { Digit, NumberEntryHint, NumberEntryOutcome, NumberEntryState } from './def.ts';

interface Step<S> {
  readonly state: S;
  readonly outcome: NumberEntryOutcome;
}

const IGNORED: NumberEntryOutcome = { kind: 'ignored' };
const TYPED: NumberEntryOutcome = { kind: 'typed' };

/** Appends a digit up to `def.maxDigits`; a lone `0` is replaced, not extended. Ignored once solved or full. */
export function enterDigit<S extends NumberEntryState>(state: S, digit: Digit): Step<S> {
  if (state.solved || state.entry.length >= state.def.maxDigits) {
    return { state, outcome: IGNORED };
  }
  const entry = state.entry === '0' ? String(digit) : `${state.entry}${String(digit)}`;
  return { state: { ...state, entry }, outcome: TYPED };
}

/** Drops the last digit. Ignored once solved or when nothing is typed. */
export function eraseDigit<S extends NumberEntryState>(state: S): Step<S> {
  if (state.solved || state.entry === '') {
    return { state, outcome: IGNORED };
  }
  return { state: { ...state, entry: state.entry.slice(0, -1) }, outcome: TYPED };
}

/** Checks the entry: right → solved; wrong → errors + 1, the entry cleared, the value reported. Both count a move. */
export function submitNumber<S extends NumberEntryState>(state: S): Step<S> {
  if (state.solved || state.entry === '') {
    return { state, outcome: IGNORED };
  }
  const value = Number(state.entry);
  if (value === state.def.answer) {
    return {
      state: { ...state, solved: true, moves: state.moves + 1 },
      outcome: { kind: 'solved' },
    };
  }
  return {
    state: { ...state, errors: state.errors + 1, moves: state.moves + 1, entry: '' },
    outcome: { kind: 'wrong', value },
  };
}

/** 1: nudge; 2: types the answer's first digit; 3: types the whole answer. `level` is already on `state.hintLevel`. */
export function numberEntryHint<S extends NumberEntryState>(
  state: S,
  level: 1 | 2 | 3,
): { readonly state: S; readonly hint: NumberEntryHint } {
  const answer = String(state.def.answer);
  if (level === 3) {
    return {
      state: { ...state, entry: answer },
      hint: { kind: 'number-entry', level, reveal: true },
    };
  }
  if (level === 2) {
    const digit = answer.slice(0, 1);
    return {
      state: { ...state, entry: digit },
      hint: { kind: 'number-entry', level, reveal: false, digit },
    };
  }
  return { state, hint: { kind: 'number-entry', level, reveal: false } };
}
