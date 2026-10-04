import { createElement } from 'react';
import type { DuelGameDef } from '@learn/platform-core';
import type { MiniGameModeUI } from '../mode-ui.ts';
import type { DuelBoard } from './board.ts';
import { DuelStep } from './DuelStep.tsx';

/** Opt-in: a subject registers `modes: { duel: createDuelModeUi({ <TurnGame id>: Board }) }` in its `SubjectWeb` (`BossStep` finds a
 * subject's mode UIs after the platform's own, by the mini-game's `mode`). */
export function createDuelModeUi(
  boards: Readonly<Record<string, DuelBoard>>,
): MiniGameModeUI<DuelGameDef> {
  return {
    mode: 'duel',
    Step: (props) => createElement(DuelStep, { ...props, boards }),
  };
}
