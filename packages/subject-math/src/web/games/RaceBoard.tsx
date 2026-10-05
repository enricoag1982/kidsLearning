// Race to N's board for the platform's `duel` step: a number track 0..target (the start and one stone per number; the start alone and two
// rows of 10 on a phone, two rows of 11 and 10 on a tablet: stones 56 px tall, 49 px wide at 1024 × 768), a token on the running total, the
// stones of the last move lit (green = the child, blue with a paw = the bot: never colour alone), and a big "+1" "+2" "+3" button per step. After each move the board speaks what happened, in the bounded set
// of lines the content's voice inventory lists (`raceVoiceTemplates`, the `RACE_*` keys), and shows the same line under the track.
import { useEffect, useRef } from 'react';
import type { CSSProperties, JSX } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useServices } from '@learn/platform-web/app/store.ts';
import { tContent } from '@learn/platform-web/content-text.ts';
import type { DuelBoard, DuelBoardProps } from '@learn/platform-web/modes/duel/board.ts';
import { tapClass } from '@learn/platform-web/ui/ds/tap.ts';
import type { RaceState } from '../../core/games/race.ts';
import { RACE_BOT_ADDS, RACE_YOU_ADD, RACE_YOUR_TURN } from '../../core/games/race-texts.ts';

const TEXT_TOTAL = 'lessons:race.total-label';

/** The race state the step hands the board (`unknown` on the platform's side); anything else is a wiring mistake. */
function raceStateOf(state: unknown): RaceState {
  if (
    typeof state === 'object' &&
    state !== null &&
    'total' in state &&
    typeof state.total === 'number' &&
    'target' in state &&
    typeof state.target === 'number' &&
    'maxStep' in state &&
    typeof state.maxStep === 'number'
  ) {
    return state as RaceState;
  }
  throw new Error('RaceBoard: the state is not a race state');
}

/** The last move as the step keeps it (`move` = the step added), when it is one. */
function stepOf(
  lastMove: DuelBoardProps['lastMove'],
): { side: 'kid' | 'bot'; step: number } | null {
  return lastMove !== undefined && typeof lastMove.move === 'number'
    ? { side: lastMove.side, step: lastMove.move }
    : null;
}

/** The line the board shows and speaks for the last move: the bot's, or the child's. */
function moveLine(
  t: TFunction,
  move: { side: 'kid' | 'bot'; step: number },
  total: number,
  bot: string,
): string {
  return move.side === 'bot'
    ? tContent(t, RACE_BOT_ADDS, { bot, step: move.step, total })
    : tContent(t, RACE_YOU_ADD, { step: move.step, total });
}

/** Speaks the move line after each move (and "Your turn!" after the bot's), then stops: nothing at the start (the step reads the goal)
 * and nothing after the finishing move (the step reads the result). The step speaks its own turn line in the same commit, so this
 * waits one microtask and replaces it; the second line is dropped when the hint came up in between (the step reads the hint). */
function useRaceSpeech(
  total: number,
  target: number,
  move: { side: 'kid' | 'bot'; step: number } | null,
  bot: string,
  hintShown: boolean,
): void {
  const { t } = useTranslation();
  const { narrator } = useServices();
  const hintRef = useRef(hintShown);
  useEffect(() => {
    hintRef.current = hintShown;
  }, [hintShown]);

  const side = move?.side;
  const step = move?.step;
  useEffect(() => {
    if (side === undefined || step === undefined || total >= target) return;
    const line = moveLine(t, { side, step }, total, bot);
    const lines = side === 'bot' ? [line, tContent(t, RACE_YOUR_TURN)] : [line];
    // Not an immediately-invoked function: the compiler would then narrow `cancelled` to `false` through the cleanup below.
    let cancelled = false;
    const speakLines = async (): Promise<void> => {
      await Promise.resolve();
      for (const [index, text] of lines.entries()) {
        if (cancelled || hintRef.current) return;
        if (index === 0) narrator.cancel();
        await narrator.speak(text);
      }
    };
    void speakLines();
    return () => {
      cancelled = true;
    };
    // The effect keys on the move (a new `lastMove` object per move): a re-render with the same move must not repeat the line.
  }, [side, step, total, target, bot, narrator, t]);
}

/** A paw print: the bot's mark on its stones (solid, no stroke; a pad and four toes). */
function PawIcon(): JSX.Element {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
      data-testid="paw"
    >
      <ellipse cx="12" cy="16.5" rx="5.5" ry="4.5" />
      <ellipse cx="5" cy="11" rx="2.2" ry="3" />
      <ellipse cx="9.5" cy="6.5" rx="2.2" ry="3" />
      <ellipse cx="14.5" cy="6.5" rx="2.2" ry="3" />
      <ellipse cx="19" cy="11" rx="2.2" ry="3" />
    </svg>
  );
}

type Look = 'ahead' | 'walked' | 'kid' | 'bot';

const LOOK_CLASS: Readonly<Record<Look, string>> = {
  ahead: 'border-line bg-card text-muted',
  walked: 'border-board-dark bg-board-light text-ink',
  kid: 'border-edge-go bg-go text-white',
  bot: 'border-edge-info bg-info text-white',
};

/** One stone of the track: the number, lit when the last move walked over it, with the token ring on the running total. The stone of
 * 1 starts the second row on a phone (the start stone 0 has a row of its own there); the goal stone has a thick gold edge. A tablet
 * (width 640 px and height 600 px up) draws it 56 px tall with a 1.125 rem number: the child's finger finds the number, not the board. */
function Stone({
  n,
  look,
  token,
  goal,
}: {
  readonly n: number;
  readonly look: Look;
  readonly token: boolean;
  readonly goal: boolean;
}): JSX.Element {
  return (
    <div
      data-stone={n}
      data-look={look}
      data-token={token ? 'true' : undefined}
      aria-current={token ? 'step' : undefined}
      className={`flex h-11 min-w-0 flex-col items-center justify-center rounded-lg font-display text-sm leading-none [@media(min-width:640px)_and_(min-height:600px)]:h-14 [@media(min-width:640px)_and_(min-height:600px)]:text-lg ${
        goal ? 'border-4 border-star' : 'border-2'
      } ${LOOK_CLASS[look]} ${
        token ? 'relative z-10 scale-110 font-bold ring-4 ring-ink motion-reduce:scale-100' : ''
      } ${n === 1 ? 'col-start-1 [@media(min-width:640px)_and_(min-height:600px)]:col-auto' : ''}`}
    >
      {look === 'bot' && <PawIcon />}
      <span>{n}</span>
    </div>
  );
}

function RaceTrack({
  race,
  legalMoves,
  disabled,
  hintMoves,
  lastMove,
  bot,
  onMove,
}: DuelBoardProps & { readonly race: RaceState }): JSX.Element {
  const { t } = useTranslation();
  const { total, target, maxStep } = race;
  const move = stepOf(lastMove);
  useRaceSpeech(total, target, move, bot, hintMoves !== undefined);

  const lookOf = (n: number): Look => {
    if (n > total) return 'ahead';
    return move !== null && n > total - move.step ? move.side : 'walked';
  };
  const steps = Array.from({ length: maxStep }, (_, index) => index + 1);

  return (
    <div className="flex h-full w-full flex-col justify-center gap-4">
      <div
        role="img"
        aria-label={tContent(t, TEXT_TOTAL, { total, target })}
        className="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1 [@media(min-width:640px)_and_(min-height:600px)]:grid-cols-[repeat(var(--stones),minmax(0,1fr))] [@media(min-width:640px)_and_(min-height:600px)]:gap-2"
        // Tablet: two rows, the start stone with the first half (0-10, then 11-20): half the stones per row, rounded up.
        style={{ '--stones': Math.ceil((target + 1) / 2) } as CSSProperties}
      >
        {Array.from({ length: target + 1 }, (_, n) => (
          <Stone key={n} n={n} look={lookOf(n)} token={n === total} goal={n === target} />
        ))}
      </div>
      <p
        role="status"
        data-testid="race-line"
        className="min-h-8 text-center font-display text-lg text-ink sm:text-xl"
      >
        {move === null ? ' ' : moveLine(t, move, total, bot)}
      </p>
      <div className="flex gap-3">
        {steps.map((step) => {
          const hinted = hintMoves?.includes(step) === true;
          return (
            <button
              key={step}
              type="button"
              data-move={JSON.stringify(step)}
              data-hint={hinted ? 'true' : undefined}
              disabled={disabled || !legalMoves.includes(step)}
              onClick={() => {
                onMove(step);
              }}
              className={tapClass(
                'custom',
                'go',
                `flex h-20 min-w-16 flex-1 items-center justify-center rounded-3xl font-display text-3xl font-semibold disabled:opacity-40 ${
                  hinted ? 'ring-4 ring-star ring-offset-2 motion-safe:animate-pulse' : ''
                }`,
              )}
            >
              {`+${String(step)}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Race to N on the duel step's board slot (`createDuelModeUi({ race: RaceBoard })`). */
export const RaceBoard: DuelBoard = (props) => (
  <RaceTrack {...props} race={raceStateOf(props.state)} />
);
