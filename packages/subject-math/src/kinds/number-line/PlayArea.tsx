import { useState } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { HintBase } from '@learn/platform-core/domain/subject';
import { ExerciseControls } from '@learn/platform-web/kinds/ExerciseControls.tsx';
import { ExerciseFrame } from '@learn/platform-web/kinds/ExercisePlay.tsx';
import { panelBody } from '@learn/platform-web/kinds/panel-body.tsx';
import { CardPromptView } from '@learn/platform-web/kinds/cards/CardPromptView.tsx';
import { PRIMARY_BUTTON } from '@learn/platform-web/ui/lesson/button-styles.ts';
import type { NumberLineHint } from './def.ts';
import { NumberLineBand } from './NumberLineBand.tsx';
import { benchmarkOf, labelledTicks, tickValues } from './ticks.ts';
import type { NumberLinePlayAreaProps } from './ui.ts';

/** `hint` as this kind's own payload, or `null` (the session hands every kind the base shape). */
function numberLineHint(hint: HintBase | null): NumberLineHint | null {
  return hint?.kind === 'number-line' ? (hint as NumberLineHint) : null;
}

/** The ticks that show their number: the def's labels, plus the middle one from hint 1 on, plus every one from hint 2 on. */
function numberedTicks(
  def: NumberLinePlayAreaProps['def'],
  hintLevel: 0 | 1 | 2 | 3,
): ReadonlySet<number> {
  if (hintLevel >= 2) return new Set(tickValues(def));
  const shown = new Set(labelledTicks(def));
  if (hintLevel === 1) shown.add(benchmarkOf(def));
  return shown;
}

/** The prompt card over the line (the board), the Hint button and Check. The marker is this component's draft: Check sends it to
 * the engine. Hint 3 puts the marker on the target; the child still taps Check. */
function NumberLinePlay({
  def,
  state,
  dispatch,
  showHint,
  top,
  done,
  actions,
}: NumberLinePlayAreaProps): JSX.Element {
  const { t } = useTranslation();
  const { core } = state;
  const [marker, setMarker] = useState<number | null>(null);

  // A new hint 3 puts the marker on the target: adjusting state to a changed input during render, React's way without an effect.
  const [seenHint, setSeenHint] = useState<HintBase | null>(null);
  if (seenHint !== state.hint) {
    setSeenHint(state.hint);
    const reveal = numberLineHint(state.hint)?.reveal;
    if (reveal !== undefined) setMarker(reveal);
  }

  const solved = core.solved;
  // A wrong Check leaves the marker where it was (shaking); Check waits for it to move.
  const wrongHere = marker !== null && marker === state.wrongValue;
  const canCheck = marker !== null && !wrongHere && !solved;
  const status = solved ? 'good' : wrongHere ? 'wrong' : 'idle';

  function check(): void {
    if (marker !== null && canCheck) {
      dispatch({ type: 'place', value: marker });
    }
  }

  // On a tablet the board slot is a 616 px square: the prompt card takes 2 parts of its height and the line card 3 (it spans the slot's
  // width and its line grows with the card); on a phone the line card keeps its 152 px under the prompt card.
  const board = (
    <div className="flex h-full w-full flex-col gap-3">
      {def.prompt !== undefined && (
        <div className="min-h-0 flex-1 lg:flex-[2]">
          <CardPromptView prompt={def.prompt} />
        </div>
      )}
      <div className={def.prompt === undefined ? 'my-auto' : 'lg:min-h-0 lg:flex-[3]'}>
        <NumberLineBand
          def={def}
          marker={marker}
          numbered={numberedTicks(def, core.hintLevel)}
          showValue={solved || core.hintLevel === 3}
          status={status}
          shakeKey={core.errors}
          locked={solved}
          onMove={setMarker}
          onCheck={check}
        />
      </div>
    </div>
  );
  const controls = (
    <ExerciseControls
      showHint={showHint}
      onHint={() => {
        dispatch({ type: 'hint' });
      }}
      extras={actions}
      slot={
        <button
          type="button"
          disabled={!canCheck}
          onClick={check}
          className={`${PRIMARY_BUTTON} disabled:opacity-40`}
        >
          {t('exercise.check')}
        </button>
      }
    />
  );
  return <ExerciseFrame board={board} panel={panelBody(top, solved, done, controls)} />;
}

/** `number-line`'s play area: an element of `NumberLinePlay` keyed by the exercise, so each exercise gets its own marker. */
export function PlayArea(props: NumberLinePlayAreaProps): JSX.Element {
  return <NumberLinePlay key={props.def.id} {...props} />;
}
