import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberPad } from '@learn/platform-web/kinds/cards/number-entry/NumberPad.tsx';
import type { NumberPadProps } from '@learn/platform-web/kinds/cards/number-entry/NumberPad.tsx';
import { ExerciseControls } from '@learn/platform-web/kinds/ExerciseControls.tsx';
import { ExerciseFrame } from '@learn/platform-web/kinds/ExercisePlay.tsx';
import { panelBody } from '@learn/platform-web/kinds/panel-body.tsx';
import { ProblemCard } from '../../web/problem-card.tsx';
import type { NumberEntryPlayAreaProps } from './ui.ts';

/** The platform's pad under math's own group name and erase text. */
function MathPad(props: Omit<NumberPadProps, 'padLabel' | 'eraseLabel'>): JSX.Element {
  const { t } = useTranslation();
  return <NumberPad {...props} padLabel={t('math.pad-label')} eraseLabel={t('math.erase')} />;
}

/** The problem card (it shows what has been typed), the Hint button and the number pad: side by side on a tablet held upright, stacked elsewhere. */
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
  const board =
    def.problem === undefined ? null : (
      <ProblemCard
        problem={def.problem}
        dots={core.hintLevel >= 1}
        answer={core.solved ? def.answer : undefined}
        entry={core.solved ? undefined : core.entry}
        wrongValue={state.wrongValue}
      />
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
      <MathPad
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
