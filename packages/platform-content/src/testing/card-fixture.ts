// A tiny subject made only of YAML (`card-subject/`) that uses all four card kinds: what the card kit's own tests and the
// platform-web App-flow test compile through `createCardContent`. One lesson entry and one series round are generated
// (`fixture-add`): the build-time expansion's own fixture (`generate/expand.test.ts`). One mini-game is a `duel` over the
// take-away game (`createCardFixtureContent` registers the mode). A second lesson (`sort-up`) uses the opt-in `group` kind in its
// three layouts (row, Carroll, Venn); the fixture registers the kind, its voice and the `series` schema over it.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_NOTES } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import { GROUP_NOTES } from '@learn/platform-core/domain/exercise/kinds/group/notes';
import { randomInt } from '@learn/platform-core/domain/random';
import { takeAwayGame } from '@learn/platform-core/testing';
import { z } from 'zod';
import type { AnyExerciseTemplate, ExerciseTemplate } from '../generate/template.ts';
import { CARD_KIND_CONTENT, createCardContent } from '../kinds/cards/content.ts';
import { cardStimulus } from '../kinds/cards/stimulus.ts';
import { GROUP_KIND_CONTENT } from '../kinds/group/content.ts';
import { groupVoiceTemplates } from '../kinds/group/voice.ts';
import { createExerciseSchema } from '../lesson-schema.ts';
import { createDuelContent } from '../modes/duel.ts';
import type { DuelGameContent } from '../modes/duel.ts';
import { duelVoiceTemplates } from '../modes/duel-voice.ts';
import { createSeriesContent } from '../modes/series.ts';
import type { ExerciseYamlBase, SubjectContent } from '../subject.ts';

/** The fixture's content root: `lessons/`, `minigames/`, `locales/`, `tracks.yaml`, `badges.yaml`. */
export const CARD_FIXTURE_ROOT = join(dirname(fileURLToPath(import.meta.url)), 'card-subject');

/** The fixture's lesson characters (one source for `createCardCore` and `createCardContent`). */
export const CARD_FIXTURE_CHARACTERS = { fox: { topicKey: 'topic.fox' } } as const;

/** A generated `a + b` number-entry item, as the YAML would spell it. */
export interface FixtureAddItem extends ExerciseYamlBase {
  readonly type: 'number-entry';
  readonly text: string;
  readonly prompt: { readonly big: string };
  readonly answer: number;
  /** The off-by-one misconception (`a + b + 1`), when it fits the pad. */
  readonly reasons?: readonly { readonly value: number; readonly text: string }[];
}

export interface FixtureAddParams {
  /** Largest sum (2–20); both addends are 1 … max − 1. */
  readonly max: number;
}

const SUM_PROMPT = /^(\d+) \+ (\d+)$/;

/** `a + b` with a, b in 1 … max − 1 and a + b ≤ max; the text is `templates.fixture-add` ("What is {{a}} plus {{b}}?").
 * The wrong answer `a + b + 1` (one jump too many) speaks `bugs.off-by-one` (a reason, `docs/adding-a-subject.md` §6). */
export const fixtureAdd: ExerciseTemplate<FixtureAddParams, FixtureAddItem> = {
  params: z.object({ max: z.number().int().min(2).max(20) }).strict(),
  generate({ max }, ctx) {
    let a: number;
    let b: number;
    do {
      a = randomInt(ctx.random, 1, max - 1);
      b = randomInt(ctx.random, 1, max - 1);
    } while (a + b > max);
    const sum = a + b;
    // The pad's default width: the answer's own digits, at least 2.
    const fits = String(sum + 1).length <= Math.max(2, String(sum).length);
    return {
      id: ctx.id,
      type: 'number-entry',
      text: ctx.text('text', 'templates.fixture-add', { a, b }),
      prompt: { big: `${String(a)} + ${String(b)}` },
      answer: sum,
      ...(fits ? { reasons: [{ value: sum + 1, text: 'bugs.off-by-one' }] } : {}),
    };
  },
  check(item, _params, at) {
    const match = SUM_PROMPT.exec(item.prompt.big);
    if (match === null) {
      at.issues.push(`${at.where}: cannot read the prompt "${item.prompt.big}" as a sum`);
      return;
    }
    const sum = Number(match[1]) + Number(match[2]);
    if (sum !== item.answer) {
      at.issues.push(
        `${at.where}: "${item.prompt.big}" is ${String(sum)}, not ${String(item.answer)}`,
      );
    }
  },
};

/** The fixture's templates (`createCardContent({ templates })`). */
export const CARD_FIXTURE_TEMPLATES: Readonly<Record<string, AnyExerciseTemplate>> = {
  'fixture-add': fixtureAdd,
};

/** The fixture's duel games (`createDuelContent` / `createDuelMode` over the same ids): the take-away game, a pile of 1-30. */
export const CARD_FIXTURE_DUEL_GAMES = {
  'take-away-fixture': {
    params: z.object({ pile: z.number().int().min(1).max(30) }).strict(),
    game: takeAwayGame,
  },
} as const satisfies Readonly<Record<string, DuelGameContent>>;

/** The fixture's kinds: the card kit's four and the opt-in `group`. */
export const CARD_FIXTURE_KIND_CONTENT = {
  ...CARD_KIND_CONTENT,
  group: GROUP_KIND_CONTENT,
} as const;

/** The fixture's note table (as `createCardCore({ notes })` has it): the kit's and the `group` kind's. */
const CARD_FIXTURE_NOTES = { ...CARD_NOTES, ...GROUP_NOTES };

/** The card fixture subject's whole content behaviour: the card kit plus the opt-in `group` kind (and the `series` schema over it),
 * the opt-in `duel` mode and the voice lines of both. */
export function createCardFixtureContent(): SubjectContent {
  const cards = createCardContent({
    characters: CARD_FIXTURE_CHARACTERS,
    templates: CARD_FIXTURE_TEMPLATES,
  });
  const exerciseSchema = createExerciseSchema(CARD_FIXTURE_KIND_CONTENT, cardStimulus);
  const groupVoice = groupVoiceTemplates(CARD_FIXTURE_NOTES);
  const duelVoice = duelVoiceTemplates(CARD_FIXTURE_CHARACTERS);
  return {
    ...cards,
    kinds: CARD_FIXTURE_KIND_CONTENT,
    modes: {
      series: createSeriesContent(exerciseSchema, Object.keys(CARD_FIXTURE_TEMPLATES)),
      duel: createDuelContent(CARD_FIXTURE_DUEL_GAMES),
    },
    voiceTemplates: (add, r, all) => {
      cards.voiceTemplates(add, r, all);
      groupVoice(add, r, all);
      duelVoice(add, r, all);
    },
  };
}
