// Math's `TurnGame`s for the platform's `duel` mode, by game id (`mode: duel`, `game: <id>` in a mini-game's YAML).
import type { TurnGame } from '@learn/platform-core';
import { race } from './race.ts';

export { race } from './race.ts';
export type { RaceMove, RaceParams, RaceState } from './race.ts';

export const MATH_GAMES: Readonly<Record<string, TurnGame>> = { race };
