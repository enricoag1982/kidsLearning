import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { DuelGameDef, DuelState } from '@learn/platform-core';
import {
  botMove,
  duelGameOf,
  duelHint,
  isDuelMode,
  kidMove,
  startDuel,
} from '@learn/platform-core';
import { useAppStore, useServices } from '../../app/store.ts';
import { usePack } from '../../app/subject.ts';
import { characterName, tContent } from '../../content-text.ts';
import { SpeechBubble } from '../../ui/ds/SpeechBubble.tsx';
import { INFO_CHIP } from '../../ui/ds/primitives-styles.ts';
import { useNarratedText } from '../../ui/ds/useNarratedText.ts';
import { SECONDARY_BUTTON } from '../../ui/lesson/button-styles.ts';
import { GameLayout } from '../../ui/lesson/GameLayout.tsx';
import { prefersReducedMotion } from '../../ui/useMediaQuery.ts';
import { BossResultPanel, useBossRun } from '../boss-run.tsx';
import type { BossStepProps } from '../mode-ui.ts';
import type { DuelBoard } from './board.ts';

/** The bot "thinks" this long before it moves; reduced motion shortens it, never to instant. */
const BOT_DELAY_MS = 900;
const BOT_DELAY_REDUCED_MS = 150;

export interface DuelStepProps extends BossStepProps<DuelGameDef> {
  /** The subject's boards by `TurnGame` id. */
  readonly boards: Readonly<Record<string, DuelBoard>>;
}

/** A `duel` boss: the kid and a bot take turns in a subject's `TurnGame` on the subject's board. The bot answers after a short
 * pause with its mistake rate's chance of a random move; Hint shows the best moves (and costs a star); Owl speaks the turn,
 * the hint and the result. */
export function DuelStep({
  lesson,
  game: minigame,
  nextStepIndex,
  session,
  boards,
}: DuelStepProps): JSX.Element {
  const { t } = useTranslation();
  const services = useServices();
  const pack = usePack();
  const goToStep = useAppStore((state) => state.goToStep);
  const hintsEnabled = useAppStore((state) => state.activeProfileSettings.hints);

  const mode = services.deps.subject.modes[minigame.mode];
  if (!isDuelMode(mode)) {
    throw new Error(`DuelStep: "${minigame.mode}" is not a registered duel mode`);
  }
  const games = mode.games;
  const turnGame = duelGameOf(minigame, games);
  const Board = boards[minigame.game];
  if (Board === undefined) {
    throw new Error(`DuelStep: no board registered for game "${minigame.game}"`);
  }
  const random = services.deps.random;

  const [duel, setDuel] = useState<DuelState>(() => startDuel(minigame, games));
  // The hint's best moves while shown (empty when there is none to give); cleared by the next move.
  const [hint, setHint] = useState<readonly unknown[] | undefined>(undefined);
  const run = useBossRun(duel, { lesson, nextStepIndex, session });

  const playing = duel.status === 'playing';
  const side = turnGame.toMove(duel.game);
  const kidTurn = playing && side === 'kid';
  const botTurn = playing && side === 'bot';

  useEffect(() => {
    if (!botTurn) return;
    const timer = setTimeout(
      () => {
        setDuel(botMove(duel, games, random));
      },
      prefersReducedMotion() ? BOT_DELAY_REDUCED_MS : BOT_DELAY_MS,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [botTurn, duel, games, random]);

  const bot =
    lesson.character in pack.core.characters
      ? characterName(t, lesson.character)
      : t('boss.duel.bot-default');
  const turnText = side === 'kid' ? t('boss.duel.your-turn') : t('boss.duel.bot-turn', { bot });
  const hintText =
    minigame.hintKey === undefined ? t('boss.duel.hint') : tContent(t, minigame.hintKey);
  const resultText =
    duel.status === 'won'
      ? t('boss.duel.won')
      : duel.status === 'lost'
        ? t('boss.duel.lost')
        : t('boss.duel.draw');
  const goalText = tContent(t, minigame.goalKey);

  // The bubble keeps the goal until the result; Owl also says whose turn it is, so the line spoken is the latest of those.
  const bubbleText = !playing ? resultText : hint === undefined ? goalText : hintText;
  const spokenText = !playing
    ? resultText
    : hint !== undefined
      ? hintText
      : duel.history.length === 0
        ? goalText
        : turnText;
  const replay = useNarratedText(services.narrator, spokenText);

  function handleMove(move: unknown): void {
    if (!kidTurn) return;
    const next = kidMove(duel, move, games);
    if (next === duel) return;
    setDuel(next);
    setHint(undefined);
  }

  function handleHint(): void {
    const given = duelHint(duel, games);
    if (given.state === duel) return;
    setDuel(given.state);
    setHint(given.moves);
  }

  function handlePlayAgain(): void {
    setDuel(startDuel(minigame, games));
    setHint(undefined);
    run.restart();
  }

  const last = duel.history[duel.history.length - 1];

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-4"
      data-duel-status={duel.status}
      data-duel-turn={side}
    >
      <h2 className="text-center font-display text-xl text-ink sm:text-3xl">
        {tContent(t, minigame.titleKey)}
      </h2>
      <GameLayout
        board={
          <div className="h-full w-full" data-duel-state={JSON.stringify(duel.game)}>
            <Board
              state={duel.game}
              legalMoves={kidTurn ? turnGame.moves(duel.game) : []}
              disabled={!kidTurn}
              {...(hint === undefined ? {} : { hintMoves: hint })}
              {...(last === undefined ? {} : { lastMove: last })}
              onMove={handleMove}
            />
          </div>
        }
        panel={
          <>
            <SpeechBubble text={bubbleText} onReplay={replay} />
            {playing && (
              <div className={INFO_CHIP} role="status" data-testid="duel-turn">
                {turnText}
              </div>
            )}
            {playing && hintsEnabled && (
              // `SECONDARY_BUTTON` bakes in `flex-1`: its own row keeps the button's height (as the versus boss does).
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleHint}
                  disabled={!kidTurn}
                  className={`${SECONDARY_BUTTON} disabled:opacity-40`}
                >
                  {t('exercise.hint')}
                </button>
              </div>
            )}
            {!playing && (
              <BossResultPanel
                stars={run.stars}
                saved={run.saved}
                alwaysPlayAgain={duel.status !== 'won'}
                session={session}
                onPlayAgain={handlePlayAgain}
                onNext={() => {
                  goToStep(nextStepIndex);
                }}
              />
            )}
          </>
        }
      />
    </div>
  );
}
