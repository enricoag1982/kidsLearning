// A stand-in for the lesson step around the `array` UI: the real kind engine, the real UI's `toUi` / `clearWrongUi`, the session's
// hint ladder and the real note table, with a bubble that shows the instruction and the note and a done block with the stars. The
// session reducer itself (`useExerciseSession`) needs the app store; the app-flow test plays the real one.
import { useEffect, useReducer } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import type { ExerciseUIState, SessionAction } from '@learn/platform-web/kinds/kind-ui.ts';
import { exerciseNote } from '@learn/platform-web/ui/lesson/exercise-text.ts';
import { mathCore } from '../../core/math-core.ts';
import type { ArrayAction, ArrayDef } from '../../kinds/array/def.ts';
import { arrayKind } from '../../kinds/array/kind.ts';
import { arrayUi } from '../../kinds/array/ui.ts';

export interface ArrayHarnessProps {
  readonly def: ArrayDef;
  readonly showHint?: boolean;
  /** Hint 1 comes by itself when the try starts (a guided try). */
  readonly guided?: boolean;
}

/** `def`'s UI in a stand-in session. The bubble is `<p data-testid="instruction">` + `<p data-testid="note">`, the done block
 * `<p data-testid="done">` (`data-stars`), and `<output data-testid="session">` carries `data-errors`, `data-solved` and
 * `data-hint-level`. */
export function ArrayHarness({
  def,
  showHint = true,
  guided = false,
}: ArrayHarnessProps): JSX.Element {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(
    (current: ExerciseUIState<ArrayDef>, action: SessionAction): ExerciseUIState<ArrayDef> => {
      const before = current.core;
      if (action.type === 'hint' || action.type === 'auto-hint') {
        const level = (before.hintLevel < 3 ? before.hintLevel + 1 : 3) as 1 | 2 | 3;
        const { state: core, hint } = arrayKind.hint(before, level, null);
        return action.type === 'hint'
          ? {
              ...current,
              core,
              hint,
              feedback: { kind: 'hint', hint },
              ...arrayUi.clearWrongUi(),
            }
          : { ...current, core, hint };
      }
      if (action.type === 'tap-first' || action.type === 'reveal') {
        return current;
      }
      const { state: core, outcome } = arrayKind.act(before, action as ArrayAction, null);
      return { ...current, core, ...arrayUi.toUi(outcome, action as ArrayAction, core) };
    },
    def,
    (initial): ExerciseUIState<ArrayDef> => ({
      core: arrayKind.init(initial),
      hint: null,
      feedback: { kind: 'instruction' },
      ...arrayUi.initUi(initial),
    }),
  );

  useEffect(() => {
    if (guided) dispatch({ type: 'auto-hint' });
    // Once, for the mounted exercise (what the session does for a guided try).
  }, [guided]);

  const solved = state.core.solved;
  const stars = solved ? arrayKind.stars(state.core) : 0;
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
      {arrayUi.PlayArea({
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
