import { errorHintStars } from '@learn/platform-core/domain/exercise/stars';
import { samePath, tilePaths } from '../../core/tiles.ts';
import { initCodingState } from '../../core/state.ts';
import type { CodingKind, FindBugDef, FindBugHint } from '../../core/types.ts';

/** Tap the tile that is wrong: `[top]` or `[top, body]`. */
export interface PickTileAction {
  readonly type: 'pick-tile';
  readonly path: readonly number[];
}

export type FindBugOutcome =
  | { readonly kind: 'solved' | 'ignored' }
  | { readonly kind: 'wrong'; readonly path: readonly number[] };

/** Three tappable tiles that include `bug`: the bug and the two nearest others in display order (earlier first on a tie), in
 * display order. Fewer when the program has fewer tiles. */
export function bugCandidates(
  program: FindBugDef['program'],
  bug: readonly number[],
): readonly (readonly number[])[] {
  const paths = tilePaths(program);
  const at = paths.findIndex((path) => samePath(path, bug));
  const others = paths
    .map((path, index) => ({ path, index }))
    .filter(({ index }) => index !== at)
    .sort((a, b) => Math.abs(a.index - at) - Math.abs(b.index - at) || a.index - b.index)
    .slice(0, 2);
  return paths.filter(
    (path, index) => index === at || others.some((other) => other.index === index),
  );
}

export const findBugKind: CodingKind<FindBugDef, PickTileAction, FindBugOutcome, FindBugHint> = {
  type: 'find-bug',
  input: 'select',

  init: initCodingState,

  act(state, action) {
    if (state.solved) {
      return { state, outcome: { kind: 'ignored' } };
    }
    if (samePath(action.path, state.def.bug)) {
      return {
        state: { ...state, solved: true, moves: state.moves + 1 },
        outcome: { kind: 'solved' },
      };
    }
    return {
      state: { ...state, errors: state.errors + 1, moves: state.moves + 1 },
      outcome: { kind: 'wrong', path: action.path },
    };
  },

  /** 1: replay up to the bug (the departure); 2: three candidate tiles; 3: the bug itself. */
  hint(state, level) {
    const bumped = { ...state, hintLevel: level };
    const { bug, program } = state.def;
    if (level === 1) {
      return { state: bumped, hint: { kind: 'find-bug', level, replayUntil: bug } };
    }
    if (level === 2) {
      return {
        state: bumped,
        hint: { kind: 'find-bug', level, candidates: bugCandidates(program, bug) },
      };
    }
    return { state: bumped, hint: { kind: 'find-bug', level, reveal: bug } };
  },

  stars(state) {
    return errorHintStars(state.hintLevel, state.errors);
  },
};
