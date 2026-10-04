// Race to N's content behaviour for the platform's `duel` mode: the schema its YAML `params` must satisfy, and the voice inventory of
// the lines its board speaks after each move (the platform's `duelVoiceTemplates` covers the turn banner, hint and result lines).
import { createDuelContent } from '@learn/platform-content/modes/duel';
import type { DuelGameContent } from '@learn/platform-content/modes/duel';
import type { CompiledContent, MiniGame, Resolve } from '@learn/platform-core';
import { z } from 'zod';
import { race } from '../core/games/race.ts';
import type { RaceParams } from '../core/games/race.ts';
import { RACE_BOT_ADDS, RACE_YOU_ADD, RACE_YOUR_TURN } from '../core/games/race-texts.ts';

/** `target` 10..30 (the number that wins), `maxStep` 2..4 (the steps are 1..maxStep). */
export const raceParamsSchema = z
  .object({ target: z.number().int().min(10).max(30), maxStep: z.number().int().min(2).max(4) })
  .strict();

/** Math's duel games: the pure rules and the schema of each one's YAML `params`. */
export const MATH_DUEL_GAMES = {
  race: { params: raceParamsSchema, game: race },
} as const satisfies Readonly<Record<string, DuelGameContent>>;

export const mathDuelContent = createDuelContent(MATH_DUEL_GAMES);

type Add = (text: string, source: string) => void;

/** The `params` of a compiled `race` duel (the content build already validated them), `undefined` for any other mini-game. */
function raceParamsOf(game: MiniGame): RaceParams | undefined {
  if (game.mode !== 'duel' || !('game' in game) || game.game !== race.id || !('params' in game)) {
    return undefined;
  }
  return raceParamsSchema.parse(game.params);
}

/** Every line the Race board speaks, for each `race` duel of the content: "{{bot}} adds {{step}}. Now it's {{total}}." and "You add
 * {{step}}. Now it's {{total}}." for every (step, total) a move can end on before the game is over (the finishing move is followed by
 * the result line instead), and "Your turn!". The bot is named as the duel step names it: the character of the lesson the game
 * unlocks after when the subject lists it, else the platform's default. */
export function raceVoiceTemplates(
  characters: Readonly<Record<string, { readonly topicKey: string }>>,
): (add: Add, r: Resolve, all: CompiledContent) => void {
  return (add, r, all) => {
    for (const duel of all.minigames) {
      const params = raceParamsOf(duel);
      if (params === undefined) continue;
      const character = all.lessons.find((lesson) => lesson.id === duel.unlockAfter)?.character;
      const bot =
        character !== undefined && character in characters
          ? r(`characters:${character}.name`)
          : r('boss.duel.bot-default');
      for (let step = 1; step <= params.maxStep; step += 1) {
        for (let total = step; total < params.target; total += 1) {
          add(r(RACE_BOT_ADDS, { bot, step, total }), 'race-bot-adds');
          add(r(RACE_YOU_ADD, { step, total }), 'race-you-add');
        }
      }
      add(r(RACE_YOUR_TURN), 'race-your-turn');
    }
  };
}
