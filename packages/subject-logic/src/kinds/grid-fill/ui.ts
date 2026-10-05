import type { ExerciseKindUI, PlayAreaProps } from '@learn/platform-web/kinds/kind-ui.ts';
import type { GridFillAction, GridFillDef, GridFillOutcome, GridFillState } from './def.ts';
import { PlayArea } from './PlayArea.tsx';

export type GridFillPlayAreaProps = PlayAreaProps<GridFillDef, GridFillState, GridFillAction>;

/** `grid-fill`: the board, the number pad or the picture tools, Notes and Hint. The selected cell, the notes mode and the tool are the
 * UI's own; the engine only hears entries. A rejected entry speaks the reason of the unit that shows it (`grid.wrong.*`), a right one
 * goes back to the instruction, the last one to the praise. Marks, crosses taken back and ignored actions change nothing the child
 * heard: the hint note, if the step has one, stays. */
export const gridFillUi: ExerciseKindUI<
  GridFillDef,
  GridFillState,
  GridFillAction,
  GridFillOutcome
> = {
  type: 'grid-fill',

  initUi: () => ({}),

  clearWrongUi: () => ({}),

  toUi(outcome, _action, next) {
    if (outcome.kind === 'wrong') {
      return {
        feedback: {
          kind: 'grid-wrong',
          puzzle: next.def.puzzle.rules,
          ...(outcome.conflict === undefined ? {} : { conflict: outcome.conflict.kind }),
        },
        hint: null,
      };
    }
    if (outcome.kind === 'solved') {
      return { feedback: { kind: 'solved' }, hint: null };
    }
    if (outcome.kind === 'placed') {
      return { feedback: { kind: 'instruction' }, hint: null };
    }
    // 'marked' (a note, a cross taken back) or 'ignored': nothing new to say; once solved, still the praise.
    if (next.solved) {
      return { feedback: { kind: 'solved' } };
    }
    return {
      feedback:
        next.hint === undefined ? { kind: 'instruction' } : { kind: 'hint', hint: next.hint },
    };
  },

  PlayArea,
};
