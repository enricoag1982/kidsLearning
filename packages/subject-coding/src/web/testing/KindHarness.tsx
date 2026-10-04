// A stand-in for the lesson step around a kind UI: the real kind engine, the real UI's `toUi` / `clearWrongUi`, the session's hint
// ladder and the real note table, with a bubble that shows the instruction and the note and a done block with the stars. The session
// reducer itself (`useExerciseSession`) needs the app store; the app-flow test plays the real one.
import { useEffect, useReducer } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { tContent } from '@learn/platform-web/content-text.ts';
import type { ExerciseUIState, SessionAction } from '@learn/platform-web/kinds/kind-ui.ts';
import { exerciseNote } from '@learn/platform-web/ui/lesson/exercise-text.ts';
import { codingCore } from '../../core/coding-core.ts';
import type { CodingExerciseDef } from '../../core/types.ts';
import { kindOf } from '../../kinds/index.ts';
import type { CodingAction, CodingState } from '../../kinds/index.ts';
import { CODING_KIND_UI } from '../kinds/ui-registry.ts';

export interface KindHarnessProps {
  readonly def: CodingExerciseDef;
  readonly showHint?: boolean;
  /** Hint 1 comes by itself when the try starts (a guided try). */
  readonly guided?: boolean;
}

/** `def`'s kind UI in a stand-in session. The bubble is `<p data-testid="instruction">` + `<p data-testid="note">`, the done block
 * `<p data-testid="done">` (`data-stars`), and `<output data-testid="session">` carries `data-errors`, `data-solved` and
 * `data-hint-level`. */
export function KindHarness({
  def,
  showHint = true,
  guided = false,
}: KindHarnessProps): JSX.Element {
  const { t } = useTranslation();
  const kind = kindOf(def);
  const kindUi = CODING_KIND_UI[def.type];
  if (kindUi === undefined) {
    throw new Error(`no kind UI for "${def.type}"`);
  }
  const [state, dispatch] = useReducer(
    (current: ExerciseUIState, action: SessionAction): ExerciseUIState => {
      const before = current.core as CodingState;
      if (action.type === 'hint' || action.type === 'auto-hint') {
        const level = (before.hintLevel < 3 ? before.hintLevel + 1 : 3) as 1 | 2 | 3;
        const { state: core, hint } = kind.hint(before, level, null);
        return action.type === 'hint'
          ? { ...current, core, hint, feedback: { kind: 'hint', hint }, ...kindUi.clearWrongUi() }
          : { ...current, core, hint };
      }
      if (action.type === 'tap-first' || action.type === 'reveal') {
        return current;
      }
      const { state: core, outcome } = kind.act(before, action as CodingAction, null);
      return { ...current, core, ...kindUi.toUi(outcome, action, core) };
    },
    def,
    (initial): ExerciseUIState => ({
      core: kind.init(initial),
      hint: null,
      feedback: { kind: 'instruction' },
      ...kindUi.initUi(initial),
    }),
  );

  useEffect(() => {
    if (guided) dispatch({ type: 'auto-hint' });
    // Once, for the mounted exercise (what the session does for a guided try).
  }, [guided]);

  const solved = state.core.solved;
  const stars = solved ? kind.stars(state.core as CodingState) : 0;
  const note = exerciseNote(t, state.feedback, 'fox', stars, false, codingCore.notes, {});
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
      {kindUi.PlayArea({
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
