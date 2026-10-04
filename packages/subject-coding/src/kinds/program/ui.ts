import type { ExerciseKindUI, PlayAreaProps } from '@learn/platform-web/kinds/kind-ui.ts';
import type { CodingKindState, ProgramDef } from '../../core/types.ts';
import { bumpFeedback, invalidReason } from './feedback.ts';
import type { ProgramAction, ProgramOutcome } from './kind.ts';
import { PlayArea } from './PlayArea.tsx';

export type ProgramPlayAreaProps = PlayAreaProps<
  ProgramDef,
  CodingKindState<ProgramDef>,
  ProgramAction
>;

/** `program`: the board, the strip, the tray and Run / Reset. The notes of a run come after it was shown (the PlayArea sends the
 * action when the animation ends), so a failed run's note and a solved run's praise are never ahead of the animal. */
export const programUi: ExerciseKindUI<
  ProgramDef,
  CodingKindState<ProgramDef>,
  ProgramAction,
  ProgramOutcome
> = {
  type: 'program',

  initUi: () => ({}),

  clearWrongUi: () => ({}),

  toUi(outcome, action, next) {
    if (outcome.kind === 'failed') {
      // The hint's pictures stay on the board, its words give way to the note.
      return outcome.run.outcome === 'bumped'
        ? { feedback: { kind: 'run-bumped', ...bumpFeedback(next.def.level, outcome.run) } }
        : { feedback: { kind: 'run-unfinished' } };
    }
    if (outcome.kind === 'invalid') {
      return {
        feedback: { kind: 'program-invalid', reason: invalidReason(next.def, action.program) },
      };
    }
    // `solved`, or `ignored` (a Run after it was solved).
    return { feedback: { kind: 'solved' }, hint: null };
  },

  PlayArea,
};
