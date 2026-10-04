// The math e2e kit: the platform's page flows bound to the math subject of the Kids Learning app (through the subjects
// hub) and its locale, plus a driver that plays any exercise from its kind's `solution()` through the kind's e2e driver
// (math's registry: the card kit's drivers, and math's own kinds as they join; one path for every kind).
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Digit } from '@learn/platform-core/domain/exercise/kinds/number-entry/def';
import { createE2ETexts } from '@learn/platform-web/e2e/i18n.ts';
import { createPages } from '@learn/platform-web/e2e/pages.ts';
import type {
  MathAction,
  MathContent,
  MathDuelGame,
  MathExerciseDef,
  MathLesson,
  MathSeriesGame,
  MathState,
} from '@learn/subject-math';
import { MATH_CHARACTERS, kindOf } from '@learn/subject-math';
import { solutionOf } from '@learn/subject-math/testing';
import { mathKindE2EOf } from '@learn/subject-math/web/kinds/e2e-registry.ts';
import { modeE2EOf } from '@learn/subject-math/web/modes/e2e-registry.ts';
// Node's ESM loader (specs run straight under Playwright, outside Vite) requires this attribute for
// a JSON import.
import rawContent from '@learn/subject-math/dist/content.json' with { type: 'json' };
import rawTracks from '@learn/subject-math/dist/tracks.json' with { type: 'json' };
import en from '@learn/subject-math/dist/locales/en.json' with { type: 'json' };
import { getSoleProfileId, withAppStorage } from '../kit/storage.ts';

/** The math locale's texts, resolved as the app renders them (`lessons:pv-hto.title`, `cards.erase`). */
export const { contentText, interpolate } = createE2ETexts({ en });

/** The shared page flows bound to the math subject's Home title and locale. */
export const {
  completeFirstRun,
  dismissCelebrationIfShown,
  pickProfileFromPicker,
  openSubject,
  startLessonToFirstGuided,
  openParentArea,
} = createPages({ appTitle: contentText('app.title'), texts: { contentText }, subjectId: 'math' });

// The content build validates this shape (invalid content fails `pnpm build`), so this is a type
// conversion, not a runtime check.
const content = rawContent as unknown as MathContent;

/** World id -> its order in the main track (World 1 Number Meadow, World 2 Mental Math Mountain). */
const worldOrder = new Map(
  (
    rawTracks as unknown as {
      tracks: readonly { worlds: readonly { id: string; order: number }[] }[];
    }
  ).tracks
    .flatMap((track) => track.worlds)
    .map((world) => [world.id, world.order] as const),
);

/** The lessons of one world in Journey order. */
export function worldLessons(worldId: string): readonly MathLesson[] {
  return content.lessons
    .filter((lesson) => lesson.world === worldId)
    .sort((a, b) => a.order - b.order);
}

export function findLesson(id: string): MathLesson {
  const lesson = content.lessons.find((entry) => entry.id === id);
  if (!lesson) throw new Error(`math content is missing lesson "${id}"`);
  return lesson;
}

export function findMiniGame(id: string): MathSeriesGame {
  const game = content.minigames.find((entry) => entry.id === id);
  if (!game) throw new Error(`math content is missing mini-game "${id}"`);
  if (game.mode !== 'series')
    throw new Error(`math mini-game "${id}" is a ${game.mode}, not a series`);
  return game;
}

export function findDuel(id: string): MathDuelGame {
  const game = content.minigames.find((entry) => entry.id === id);
  if (!game) throw new Error(`math content is missing mini-game "${id}"`);
  if (game.mode !== 'duel') throw new Error(`math mini-game "${id}" is a ${game.mode}, not a duel`);
  return game;
}

/** Escapes regex metacharacters so `text` can be embedded literally in a `RegExp` source. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Accessible name of a lesson's Journey node for `status`: the lesson's title, or for the first lesson of a character the character's
 * name plus a wildcarded topic word (only app UI code maps character to topic; a later lesson of the same character shows its own
 * title, so no two nodes share a label).
 */
export function journeyNodeName(lesson: MathLesson, status: 'current' | 'locked'): RegExp {
  // The first lesson of a character is the first one of its first world (lesson orders restart in every world).
  const firstOfCharacter = [...content.lessons]
    .filter((entry) => entry.character === lesson.character)
    .sort(
      (a, b) =>
        (worldOrder.get(a.world) ?? 0) - (worldOrder.get(b.world) ?? 0) || a.order - b.order,
    )[0];
  const name =
    MATH_CHARACTERS[lesson.character] !== undefined && firstOfCharacter?.id === lesson.id
      ? `${escapeRegExp(contentText(`characters:${lesson.character}.name`))} the .+`
      : escapeRegExp(contentText(lesson.titleKey));
  const pattern = interpolate(contentText('journey:ui.node-name'), {
    name,
    status: escapeRegExp(contentText(`journey:ui.status-${status}`)),
  });
  return new RegExp(`^${pattern}$`);
}

/**
 * Opens the Journey's tab of a world ("2 Mental Math Mountain": its number and title). The Journey opens on the world the child is in;
 * once that world is finished it moves on to the next one (or, when every world is done, back to the first), so a finished world's boss
 * node is looked up on its own tab.
 */
export async function openJourneyWorld(page: Page, order: number, worldId: string): Promise<void> {
  await page
    .getByRole('button', {
      name: `${String(order)} ${contentText(`journey:worlds.${worldId}`)}`,
      exact: true,
    })
    .click();
}

/** Accessible name of the world boss's Journey node for `status`. */
export function worldBossNodeName(
  game: MathSeriesGame,
  status: 'available' | 'locked' | 'won',
): string {
  return interpolate(contentText('journey:ui.world-boss-name'), {
    title: contentText(game.titleKey),
    status: contentText(`journey:ui.boss-status-${status}`),
  });
}

/**
 * Folds `actions` over `def`'s own kind, from `from` (a fresh state by default): computes each step purely (`kind.act`, the same call
 * the app's reducer makes) and drives the UI to reproduce it through the kind's e2e driver. Returns the state it ends in, so a
 * later call can go on from it (blocks left after a wrong Check, a hint's typed digit).
 */
async function runActions(
  page: Page,
  def: MathExerciseDef,
  actions: readonly MathAction[],
  from: MathState = kindOf(def).init(def),
): Promise<MathState> {
  const kind = kindOf(def);
  const driver = mathKindE2EOf(def.type);
  let state = from;
  for (const action of actions) {
    const before = state;
    const { state: next, outcome } = kind.act(before, action, null);
    await driver.perform(page, action, { def, before, outcome, text: contentText });
    state = next;
    // The entry strip echoes what was typed (a number-entry's state only); waiting for it keeps the next tap off a stale render.
    if (!next.solved && 'entry' in next && next.entry !== '') {
      const label = interpolate(contentText('cards.entry-label'), { value: next.entry });
      await expect(page.getByRole('status', { name: label, exact: true })).toBeVisible();
    }
  }
  return state;
}

/** Performs `actions` of `def`'s own kind through the UI, from `from` (default: a fresh exercise), and returns the state: the
 * exercise stays on the page, whatever the outcome (a wrong try, a typed bug value, a build). */
export function performActions(
  page: Page,
  def: MathExerciseDef,
  actions: readonly MathAction[],
  from?: MathState,
): Promise<MathState> {
  return runActions(page, def, actions, from);
}

/** The kind's own wrong try (`wrongAction`: a build with the tens and ones swapped, the next number, another card, a tick left of the
 * target) and its own solution, as pure actions. */
export function wrongActionsOf(def: MathExerciseDef): readonly MathAction[] {
  return solutionOf(def).wrongAction?.(def, null) ?? [];
}

export function solutionActionsOf(def: MathExerciseDef): readonly MathAction[] {
  return solutionOf(def).solution(def, null);
}

/** The pad actions that type `value` and press Check (a number-entry exercise). */
export function typedNumber(value: number): readonly MathAction[] {
  return [
    ...Array.from(String(value), (char): MathAction => ({
      type: 'enter-digit',
      digit: Number(char) as Digit,
    })),
    { type: 'submit-number' },
  ];
}

/** Solves any exercise definition through the UI, leaving it on its success panel. */
export async function solveExercise(page: Page, def: MathExerciseDef): Promise<void> {
  await runActions(page, def, solutionActionsOf(def));
}

/** Solves one guided try or scored exercise, then advances past its success panel. */
export async function completeExercise(page: Page, def: MathExerciseDef): Promise<void> {
  await solveExercise(page, def);
  await page.getByRole('button', { name: /^Next/ }).click();
}

/** Plays a lesson from its first guided try to its Complete step: every guided try, then every exercise. */
export async function playLesson(page: Page, lesson: MathLesson): Promise<void> {
  for (const exercise of [...lesson.guided, ...lesson.exercises]) {
    await completeExercise(page, exercise);
  }
}

/** Plays a series mini-game round by round with the mode's own e2e driver, leaving its result showing. */
export async function playSeries(page: Page, game: MathSeriesGame): Promise<void> {
  await modeE2EOf(game.mode).play(page, game, { text: contentText, solve: solveExercise });
}

/** Plays a duel mini-game to its end with the mode's own e2e driver (a best move every kid turn), leaving its result panel showing. */
export async function playDuel(page: Page, game: MathDuelGame): Promise<void> {
  await modeE2EOf(game.mode).play(page, game, { text: contentText, solve: solveExercise });
}

/**
 * Seeds `lessons` as mastered (every exercise at 3 stars) and `miniGames` as won (a `MiniGameProgress` with `wins: 1`, 3 stars) in the
 * math store for the one seeded profile, then reloads and returns to the Math Home through the picker: what a child who played them in
 * an earlier session would see.
 */
export async function seedMasteredAndReopen(
  page: Page,
  nickname: string,
  lessons: readonly MathLesson[],
  miniGames: readonly string[],
): Promise<void> {
  const profileId = await getSoleProfileId(page);
  await withAppStorage(
    page,
    async (repos) => {
      const now = new Date().toISOString();
      for (const lesson of lessons) {
        await repos.progress.saveLesson({
          id: `seed-${lesson.id}`,
          profileId,
          lessonId: lesson.id,
          bestStars: Object.fromEntries(
            lesson.exercises.map((exercise) => [exercise.id, 3 as const]),
          ),
          bossStars: 0,
          resumeStep: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
      for (const miniGameId of miniGames) {
        await repos.progress.saveMiniGame({
          id: `seed-${miniGameId}`,
          profileId,
          miniGameId,
          bestStars: 3,
          plays: 1,
          wins: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
    },
    'math',
  );
  await page.reload();
  await pickProfileFromPicker(page, nickname);
}

/** The saved progress of one mini-game of the math store (the first profile's), or `undefined` before it was played. */
export async function readMiniGameProgress(
  page: Page,
  miniGameId: string,
): Promise<
  { readonly bestStars: number; readonly plays: number; readonly wins: number } | undefined
> {
  const profileId = await getSoleProfileId(page);
  return withAppStorage(
    page,
    async (repos) => {
      const saved = await repos.progress.getMiniGame(profileId, miniGameId);
      return saved === undefined
        ? undefined
        : { bestStars: saved.bestStars, plays: saved.plays, wins: saved.wins };
    },
    'math',
  );
}

/**
 * Plays the Today session's warm-up when it opens with one, then leaves the session on its next activity (a lesson's story, or a
 * `series` boss's first round). A warm-up task is one of `candidates` (the due concept's exercises, picked at random by the app):
 * the one whose instruction is showing is solved, then Next. `nextActivity` is a text only the activity after the warm-up shows.
 */
export async function playWarmUp(
  page: Page,
  candidates: readonly MathExerciseDef[],
  nextActivity: RegExp | string,
): Promise<void> {
  const label = page.getByText(/^Warm-up \d+\/\d+$/);
  for (;;) {
    await label.or(page.getByText(nextActivity)).first().waitFor();
    if (!(await label.isVisible())) return;
    const instruction = (def: MathExerciseDef) =>
      page.getByText(contentText(def.textKey), { exact: true });
    await Promise.any(candidates.map((def) => instruction(def).waitFor()));
    let shown: MathExerciseDef | undefined;
    for (const def of candidates) {
      if (await instruction(def).isVisible()) shown = def;
    }
    if (shown === undefined) throw new Error('playWarmUp: no candidate instruction is showing');
    await completeExercise(page, shown);
  }
}
