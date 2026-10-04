// A stand-in for the lesson step around the `number-line` UI: the real kind engine, the real UI's `toUi` / `clearWrongUi`, the session's
// hint ladder and the real note table, with a bubble that shows the instruction and the note and a done block with the stars. The session
// reducer itself (`useExerciseSession`) needs the app store; the app-flow test plays the real one.
import { useEffect, useReducer } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import type { ExerciseUIState, SessionAction } from '@learn/platform-web/kinds/kind-ui.ts';
import { exerciseNote } from '@learn/platform-web/ui/lesson/exercise-text.ts';
import { mathCore } from '../../core/math-core.ts';
import type { NumberLineDef, PlaceAction } from '../../kinds/number-line/def.ts';
import { numberLineKind } from '../../kinds/number-line/kind.ts';
import { numberLineUi } from '../../kinds/number-line/ui.ts';

export interface NumberLineHarnessProps {
  readonly def: NumberLineDef;
  readonly showHint?: boolean;
  /** Hint 1 comes by itself when the try starts (a guided try). */
  readonly guided?: boolean;
}

/** `def`'s UI in a stand-in session. The bubble is `<p data-testid="instruction">` + `<p data-testid="note">`, the done block
 * `<p data-testid="done">` (`data-stars`), and `<output data-testid="session">` carries `data-errors`, `data-solved` and
 * `data-hint-level`. */
export function NumberLineHarness({
  def,
  showHint = true,
  guided = false,
}: NumberLineHarnessProps): JSX.Element {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(
    (
      current: ExerciseUIState<NumberLineDef>,
      action: SessionAction,
    ): ExerciseUIState<NumberLineDef> => {
      const before = current.core;
      if (action.type === 'hint' || action.type === 'auto-hint') {
        const level = (before.hintLevel < 3 ? before.hintLevel + 1 : 3) as 1 | 2 | 3;
        const { state: core, hint } = numberLineKind.hint(before, level, null);
        return action.type === 'hint'
          ? {
              ...current,
              core,
              hint,
              feedback: { kind: 'hint', hint },
              ...numberLineUi.clearWrongUi(),
            }
          : { ...current, core, hint };
      }
      if (action.type === 'tap-first' || action.type === 'reveal') {
        return current;
      }
      const { state: core, outcome } = numberLineKind.act(before, action as PlaceAction, null);
      return { ...current, core, ...numberLineUi.toUi(outcome, action as PlaceAction, core) };
    },
    def,
    (initial): ExerciseUIState<NumberLineDef> => ({
      core: numberLineKind.init(initial),
      hint: null,
      feedback: { kind: 'instruction' },
      ...numberLineUi.initUi(initial),
    }),
  );

  useEffect(() => {
    if (guided) dispatch({ type: 'auto-hint' });
    // Once, for the mounted exercise (what the session does for a guided try).
  }, [guided]);

  const solved = state.core.solved;
  const stars = solved ? numberLineKind.stars(state.core) : 0;
  const note = exerciseNote(t, state.feedback, 'hedgehog', stars, false, mathCore.notes, {});
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
        data-solved={solved}
        data-hint-level={state.core.hintLevel}
      />
      {numberLineUi.PlayArea({
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
