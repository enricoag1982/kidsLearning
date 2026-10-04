// The duel step's narrated lines as a voice inventory: a bounded set (docs/voice.md), derived from the content the way the step
// speaks them. Plugs into `SubjectContent.voiceTemplates` next to the subject's own (the card kit's `cardVoiceTemplates`).
import type { CompiledContent, Resolve } from '@learn/platform-core';
import type { DuelMiniGame } from './duel.ts';

type Add = (text: string, source: string) => void;

function isDuel(game: CompiledContent['minigames'][number]): game is DuelMiniGame {
  return game.mode === 'duel';
}

/** Per duel mini-game set: "Your turn", the result lines (won / lost / draw), the platform's hint line for a game without its own,
 * each game's own hint line, and "{{bot}}'s turn" for every distinct bot name. The bot is the character of the lesson the game
 * unlocks after (the step's `lesson.character`): its `characters:<id>.name` when the subject lists it, else the platform's
 * `boss.duel.bot-default` (Owl teaches the lessons without a character). A content without a duel adds nothing. */
export function duelVoiceTemplates(
  characters: Readonly<Record<string, { readonly topicKey: string }>>,
): (add: Add, r: Resolve, all: CompiledContent) => void {
  return (add, r, all) => {
    const duels = all.minigames.filter(isDuel);
    if (duels.length === 0) {
      return;
    }
    for (const key of ['your-turn', 'won', 'lost', 'draw']) {
      add(r(`boss.duel.${key}`), 'duel');
    }
    if (duels.some((duel) => duel.hintKey === undefined)) {
      add(r('boss.duel.hint'), 'duel');
    }
    for (const duel of duels) {
      if (duel.hintKey !== undefined) {
        add(r(duel.hintKey), 'duel-hint');
      }
      const character = all.lessons.find((lesson) => lesson.id === duel.unlockAfter)?.character;
      const bot =
        character !== undefined && character in characters
          ? r(`characters:${character}.name`)
          : r('boss.duel.bot-default');
      add(r('boss.duel.bot-turn', { bot }), 'duel');
    }
  };
}
