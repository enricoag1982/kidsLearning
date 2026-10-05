// A stand-in for the lesson step around the `grid-fill` UI: the real kind engine, the real UI's `toUi` / `clearWrongUi`, the session's
// hint ladder and `tap-first`, and the real note table, with a bubble that shows the instruction and the note and a done block with
// the stars. The session reducer itself (`useExerciseSession`) needs the app store; the app-flow test plays the real one.
import { useEffect, useReducer } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import type { ExerciseUIState, SessionAction } from '@learn/platform-web/kinds/kind-ui.ts';
import { exerciseNote } from '@learn/platform-web/ui/lesson/exercise-text.ts';
import { logicCore } from '../../core/logic-core.ts';
import type { GridFillAction, GridFillDef, GridFillState } from '../../kinds/grid-fill/def.ts';
import { gridFillKind } from '../../kinds/grid-fill/kind.ts';
import { gridFillUi } from '../../kinds/grid-fill/ui.ts';

type UiState = ExerciseUIState<GridFillDef, GridFillState>;

export interface GridFillHarnessProps {
  readonly def: GridFillDef;
  readonly showHint?: boolean;
  /** Hint 1 comes by itself when the try starts (a guided try). */
  readonly guided?: boolean;
}

/** `def`'s UI in a stand-in session. The bubble is `<p data-testid="instruction">` + `<p data-testid="note">` (`data-tone`), the done
 * block `<p data-testid="done">` (`data-stars`), and `<output data-testid="session">` carries `data-errors`, `data-moves`, `data-solved`
 * and `data-hint-level`. */
export function GridFillHarness({
  def,
  showHint = true,
  guided = false,
}: GridFillHarnessProps): JSX.Element {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(
    (current: UiState, action: SessionAction): UiState => {
      const before = current.core;
      if (action.type === 'hint' || action.type === 'auto-hint') {
        const level = (before.hintLevel < 3 ? before.hintLevel + 1 : 3) as 1 | 2 | 3;
        const { state: core, hint } = gridFillKind.hint(before, level, null);
        return action.type === 'hint'
          ? {
              ...current,
              core,
              hint,
              feedback: { kind: 'hint', hint },
              ...gridFillUi.clearWrongUi(),
            }
          : { ...current, core, hint };
      }
      if (action.type === 'tap-first') {
        return { ...current, feedback: { kind: 'tap-first' } };
      }
      if (action.type === 'reveal') {
        return current;
      }
      const { state: core, outcome } = gridFillKind.act(before, action as GridFillAction, null);
      return { ...current, core, ...gridFillUi.toUi(outcome, action as GridFillAction, core) };
    },
    def,
    (initial): UiState => ({
      core: gridFillKind.init(initial),
      hint: null,
      feedback: { kind: 'instruction' },
      ...gridFillUi.initUi(initial),
    }),
  );

  useEffect(() => {
    if (guided) dispatch({ type: 'auto-hint' });
    // Once, for the mounted exercise (what the session does for a guided try).
  }, [guided]);

  const solved = state.core.solved;
  const stars = solved ? gridFillKind.stars(state.core) : 0;
  const note = exerciseNote(t, state.feedback, 'panda', stars, false, logicCore.notes, {});
  const top = (
    <div>
      <p data-testid="instruction">{tContent(t, def.textKey)}</p>
      {note !== undefined && (
        <p data-testid="note" data-tone={note.tone}>
          {note.text}
        </p>
      )}
    </div>
  );
  return (
    <>
      <output
        data-testid="session"
        data-errors={state.core.errors}
        data-moves={state.core.moves}
        data-solved={solved}
        data-hint-level={state.core.hintLevel}
      />
      {gridFillUi.PlayArea({
        def,
        state,
        dispatch,
        showHint,
        showCheck: true,
        top,
        done: solved ? (
          <p data-testid="done" data-stars={stars}>
            Done
          </p>
        ) : null,
      })}
    </>
  );
}
