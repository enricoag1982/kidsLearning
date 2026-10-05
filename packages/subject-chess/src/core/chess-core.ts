// Chess's `SubjectCore`: the concrete values the platform seam `createSubjectRuntime` / `AppDeps.subject` plugs in. Chess-bound.
import { chessGameRecordOf } from './app/games.ts';
import { CHESS_SETTINGS_SLOT } from './chess/settings-slot.ts';
import { chessJsRules } from './chess/chessjs-rules.ts';
import {
  chessRewardFacts,
  chessConditionValue,
  type ChessRewardFacts,
} from './chess/facts/rewards.ts';
import type { PieceType } from './chess/types.ts';
import { createVariantRules } from './variant/rules.ts';
import type { VariantRules } from './variant/rules.ts';
import { EXERCISE_KINDS } from '../kinds/index.ts';
import { EXERCISE_NOTES } from './exercise/notes.ts';
import { staticMode } from '../modes/static/mode.ts';
import { versusMode } from '../modes/versus/mode.ts';
import { composeDefaultSettings } from '@learn/platform-core/domain/profile-settings';
import type { SubjectCore } from '@learn/platform-core/domain/subject';
import type { ProfileSettings } from '@learn/platform-core/domain/profile-settings';

/** The World-2 piece-lesson characters, one per piece (Rook .. Pawn): the one source `CHESS_CHARACTERS.topicKey`,
 * the pack's `characterArt` and content's `voice-texts.ts` derive from. */
export const CHARACTER_PIECES: Readonly<Record<string, PieceType>> = {
  rook: 'r',
  bishop: 'b',
  queen: 'q',
  king: 'k',
  knight: 'n',
  pawn: 'p',
};

/** The World-2 piece-lesson characters; key order is `animalFriends`' friend order (the Den's piece order). */
export const CHESS_CHARACTERS = Object.fromEntries(
  Object.entries(CHARACTER_PIECES).map(([character, piece]) => [
    character,
    { topicKey: `piece.${piece}` },
  ]),
);

/** Chess's `SubjectCore`: 8 exercise kinds, `static` / `versus` modes (`series` comes from `createSubjectRuntime`), its badge
 * facts, versus→GameRecord translation and piece characters. */
export const chessCore: SubjectCore<VariantRules, ChessRewardFacts> = {
  id: 'chess',
  context: createVariantRules(chessJsRules),
  kinds: EXERCISE_KINDS,
  modes: { static: staticMode, versus: versusMode },
  rewards: { facts: chessRewardFacts, conditionValue: chessConditionValue },
  gameRecordOf: chessGameRecordOf,
  characters: CHESS_CHARACTERS,
  notes: EXERCISE_NOTES,
  noteVars: () => ({}),
  settings: CHESS_SETTINGS_SLOT,
};

/** The chess app's full default settings as a plain constant (the web store's initial / new-profile state). */
export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = composeDefaultSettings(chessCore.settings);
