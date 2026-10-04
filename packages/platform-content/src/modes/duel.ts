import type { DuelGameDef, TurnGame } from '@learn/platform-core';
import { z } from 'zod';
import { keySchema, textRefSchema } from '../schema.ts';
import { miniGameCommonFields } from './common.ts';
import type {
  MiniGameCompileContext,
  MiniGameModeContent,
  ModeVerifyContext,
} from './mode-content.ts';

/** A `duel` mini-game's compiled content: the platform's def (`DuelGameDef` already carries the shared catalog fields). */
export type DuelMiniGame = DuelGameDef;

/** One game a subject offers to `duel` mini-games: its pure rules and the schema its YAML `params` must satisfy. */
export interface DuelGameContent {
  readonly params: z.ZodType;
  readonly game: TurnGame;
}

type DuelGames = Readonly<Record<string, DuelGameContent>>;

/** Whether the kid can force a win: moving first, the start position is won; moving second, every perfect (or, when the bot is
 * lost anyway, every legal) opening of the bot leaves the kid a won position. Returns the reason it cannot, else `undefined`. */
function winnabilityIssue(content: DuelGameContent, def: DuelMiniGame): string | undefined {
  const { game } = content;
  const start = game.start(def.params, def.first);
  if (game.result(start) !== undefined) {
    return 'the game is already over at the start';
  }
  if (game.toMove(start) === 'kid') {
    return game.bestMoves(start).length > 0
      ? undefined
      : 'the kid cannot force a win moving first: the start position is lost for the mover';
  }
  const perfect = game.bestMoves(start);
  const openings = perfect.length > 0 ? perfect : game.moves(start);
  if (openings.length === 0) {
    return 'the bot has no opening move';
  }
  const stuck = openings.some((opening) => {
    const next = game.play(start, opening);
    return game.result(next) !== undefined || game.bestMoves(next).length === 0;
  });
  if (!stuck) {
    return undefined;
  }
  return perfect.length > 0
    ? 'the bot wins from the start with perfect play, so the kid cannot win (start the kid on a lost pile or let the kid open)'
    : 'an opening of the bot ends the game or leaves the kid no winning move';
}

/** The `duel` mode over the subject's games (`createDuelMode`'s counterpart): `game` names one, `params` must satisfy its schema,
 * `level` 1-3 is the bot's mistake rate, `first` who opens, and the kid must be able to force a win. An optional `hint` text
 * ref (default none: the platform's own hint text) is the game's own hint line. */
export function createDuelContent(games: DuelGames) {
  const schema = z
    .object({
      ...miniGameCommonFields,
      mode: z.literal('duel'),
      game: keySchema,
      params: z.unknown(),
      level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      first: z.enum(['kid', 'bot']),
      hint: textRefSchema.optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      const entry = games[value.game];
      if (entry === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['game'],
          message: `unknown game "${value.game}" (known: ${Object.keys(games).join(', ')})`,
        });
        return;
      }
      const parsed = entry.params.safeParse(value.params);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({
            code: 'custom',
            path: ['params', ...issue.path],
            message: issue.message,
          });
        }
      }
    });

  function compile(raw: z.output<typeof schema>, ctx: MiniGameCompileContext): DuelMiniGame | null {
    const entry = games[raw.game];
    const params = entry?.params.safeParse(raw.params);
    if (params?.success !== true) {
      ctx.issues.push(`${ctx.relPath}: game "${raw.game}" params do not parse`);
      return null;
    }
    return {
      mode: 'duel',
      id: raw.id,
      concept: raw.concept,
      game: raw.game,
      params: params.data,
      level: raw.level,
      first: raw.first,
      ...(raw.hint === undefined ? {} : { hintKey: `lessons:${raw.hint}` }),
      titleKey: `lessons:${raw.title ?? `${raw.id}.title`}`,
      goalKey: `lessons:${raw.goal ?? `${raw.id}.goal`}`,
      unlockAfter: raw.unlockAfter,
    };
  }

  function verify(miniGame: DuelMiniGame, where: string, ctx: ModeVerifyContext): void {
    const entry = games[miniGame.game];
    if (entry === undefined) {
      ctx.issues.push(`${where}: unknown game "${miniGame.game}"`);
      return;
    }
    if (miniGame.hintKey !== undefined) {
      ctx.checkTextKey(miniGame.hintKey, `${where}: hint`);
    }
    try {
      const issue = winnabilityIssue(entry, miniGame);
      if (issue !== undefined) {
        ctx.issues.push(`${where}: ${issue}`);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      ctx.issues.push(`${where}: game "${miniGame.game}" failed on its start position: ${reason}`);
    }
  }

  const mode: MiniGameModeContent<DuelMiniGame, typeof schema> = {
    mode: 'duel',
    schema,
    compile,
    verify,
  };
  return mode;
}
