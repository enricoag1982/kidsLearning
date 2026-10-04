import type { JSX } from 'react';
import { ExerciseControls } from '../../ExerciseControls.tsx';
import { ExerciseFrame } from '../../ExercisePlay.tsx';
import { panelBody } from '../../panel-body.tsx';
import { CardPromptView } from '../CardPromptView.tsx';
import { EntryDisplay } from './EntryDisplay.tsx';
import { NumberPad } from './NumberPad.tsx';
import type { NumberEntryPlayAreaProps } from './ui.ts';

/** The prompt card over what has been typed (the board), the Hint button and the number pad: side by side on a tablet held upright,
 * stacked elsewhere. */
export function PlayArea({
  def,
  state,
  dispatch,
  showHint,
  top,
  done,
  actions,
}: NumberEntryPlayAreaProps): JSX.Element {
  const { core } = state;
  const board = (
    <div className="flex h-full w-full flex-col gap-3">
      {def.prompt !== undefined && (
        <div className="min-h-0 flex-1">
          <CardPromptView prompt={def.prompt} />
        </div>
      )}
      <EntryDisplay
        entry={core.entry}
        wrongValue={state.wrongValue}
        solved={core.solved}
        grow={def.prompt === undefined}
      />
    </div>
  );
  const controls = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3 lg:flex-col lg:items-stretch lg:gap-2">
      {(showHint || actions !== undefined) && (
        <div className="sm:flex-1 lg:flex-none">
          <ExerciseControls
            showHint={showHint}
            onHint={() => {
              dispatch({ type: 'hint' });
            }}
            extras={actions}
          />
        </div>
      )}
      <NumberPad
        canCheck={core.entry !== ''}
        onDigit={(digit) => {
          dispatch({ type: 'enter-digit', digit });
        }}
        onErase={() => {
          dispatch({ type: 'erase-digit' });
        }}
        onCheck={() => {
          dispatch({ type: 'submit-number' });
        }}
      />
    </div>
  );
  return <ExerciseFrame board={board} panel={panelBody(top, core.solved, done, controls)} />;
}
