// A stand-in for the lesson step around a place-value UI: the real kind engine, the real UI's `toUi` / `clearWrongUi`, the session's
// hint ladder and the real note table, with a bubble that shows the instruction and the note and a done block with the stars. The
// session reducer itself (`useExerciseSession`) needs the app store; the App-flow test plays the real one.
import { useEffect, useReducer } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import type { ExerciseUIState, SessionAction } from '@learn/platform-web/kinds/kind-ui.ts';
import { exerciseNote } from '@learn/platform-web/ui/lesson/exercise-text.ts';
import { mathCore } from '../../core/math-core.ts';
import type { PlaceValueDef } from '../../core/types.ts';
import type { BuildAction } from '../../kinds/place-value/def.ts';
import { placeValueKind } from '../../kinds/place-value/kind.ts';
import { placeValueUi } from '../../kinds/place-value/ui.ts';

export interface PlaceValueHarnessProps {
  readonly def: PlaceValueDef;
  readonly showHint?: boolean;
  /** Hint 1 comes by itself when the try starts (a guided try). */
  readonly guided?: boolean;
}

/** `def`'s UI in a stand-in session. The bubble is `<p data-testid="instruction">` + `<p data-testid="note">`, the done block
 * `<p data-testid="done">` (`data-stars`), and `<output data-testid="session">` carries `data-errors`, `data-solved`, `data-moves` and
 * `data-hint-level`. */
export function PlaceValueHarness({
  def,
  showHint = true,
  guided = false,
}: PlaceValueHarnessProps): JSX.Element {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(
    (
      current: ExerciseUIState<PlaceValueDef>,
      action: SessionAction,
    ): ExerciseUIState<PlaceValueDef> => {
      const before = current.core;
      if (action.type === 'hint' || action.type === 'auto-hint') {
        const level = (before.hintLevel < 3 ? before.hintLevel + 1 : 3) as 1 | 2 | 3;
        const { state: core, hint } = placeValueKind.hint(before, level, null);
        return action.type === 'hint'
          ? {
              ...current,
              core,
              hint,
              feedback: { kind: 'hint', hint },
              ...placeValueUi.clearWrongUi(),
            }
          : { ...current, core, hint };
      }
      if (action.type === 'tap-first' || action.type === 'reveal') {
        return current;
      }
      const { state: core, outcome } = placeValueKind.act(before, action as BuildAction, null);
      return { ...current, core, ...placeValueUi.toUi(outcome, action as BuildAction, core) };
    },
    def,
    (initial): ExerciseUIState<PlaceValueDef> => ({
      core: placeValueKind.init(initial),
      hint: null,
      feedback: { kind: 'instruction' },
      ...placeValueUi.initUi(initial),
    }),
  );

  useEffect(() => {
    if (guided) dispatch({ type: 'auto-hint' });
    // Once, for the mounted exercise (what the session does for a guided try).
  }, [guided]);

  const solved = state.core.solved;
  const stars = solved ? placeValueKind.stars(state.core) : 0;
  const note = exerciseNote(t, state.feedback, 'owl', stars, false, mathCore.notes, {});
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
        data-moves={state.core.moves}
        data-hint-level={state.core.hintLevel}
      />
      {placeValueUi.PlayArea({
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
