import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, CloseIcon } from '../../../ui/ds/icons.tsx';
import { tapClass } from '../../../ui/ds/tap.ts';
import { ExerciseControls } from '../../ExerciseControls.tsx';
import { ExerciseFrame } from '../../ExercisePlay.tsx';
import { panelBody } from '../../panel-body.tsx';
import { CardPromptView } from '../CardPromptView.tsx';
import type { TrueFalsePlayAreaProps } from './ui.ts';

const BUTTON_SHAPE =
  'flex h-20 min-w-16 items-center justify-center gap-3 rounded-2xl font-display text-2xl font-semibold';

/** One answer button: a check or a cross and its word. A wrong one is ruled out like a choice's; the revealed answer is outlined
 * in green. */
function AnswerButton({
  value,
  ruledOut,
  revealed,
  onAnswer,
}: {
  readonly value: boolean;
  readonly ruledOut: boolean;
  readonly revealed: boolean;
  readonly onAnswer: (value: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      disabled={ruledOut}
      aria-disabled={ruledOut}
      onClick={() => {
        onAnswer(value);
      }}
      className={tapClass(
        'custom',
        'neutral',
        `${BUTTON_SHAPE} ${ruledOut ? 'border-today text-today opacity-80' : ''} ${revealed ? 'tap-border-go' : ''}`,
      )}
    >
      {value ? (
        <CheckIcon size={32} strokeWidth={3} className="text-go" />
      ) : (
        <CloseIcon size={32} className="text-today" />
      )}
      {t(value ? 'cards.true' : 'cards.false')}
    </button>
  );
}

/** The prompt card (if any), the Hint button and two big buttons, True and False. After a level-3 hint the right one is outlined in
 * green. */
export function PlayArea({
  def,
  state,
  dispatch,
  showHint,
  top,
  done,
  actions,
}: TrueFalsePlayAreaProps): JSX.Element {
  const { core } = state;
  const ruledOut = core.wrongOptions ?? [];
  const revealed = core.hintLevel >= 3;
  const answer = (value: boolean): void => {
    dispatch({ type: 'answer-true-false', value });
  };
  const controls = (
    <>
      <ExerciseControls
        showHint={showHint}
        onHint={() => {
          dispatch({ type: 'hint' });
        }}
        extras={actions}
        size="large"
      />
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((value) => (
          <AnswerButton
            key={String(value)}
            value={value}
            ruledOut={ruledOut.includes(String(value))}
            revealed={revealed && def.answer === value}
            onAnswer={answer}
          />
        ))}
      </div>
    </>
  );
  return (
    <ExerciseFrame
      board={def.prompt === undefined ? null : <CardPromptView prompt={def.prompt} />}
      panel={panelBody(top, core.solved, done, controls)}
    />
  );
}
