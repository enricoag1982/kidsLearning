// The logic e2e kit: the platform's page flows bound to the Logic subject of the Kids Learning app (through the subjects hub) and its
// locale, plus a driver that plays any exercise from its kind's `solution()` through the kind's e2e driver (logic's registry: the
// card kit's drivers, and logic's own kinds as they join; one path for every kind), seeds lessons as mastered and the boss as won in
// the logic store, and plays a lesson or the Pattern Train round by round.
import type { Page } from '@playwright/test';
import { createE2ETexts } from '@learn/platform-web/e2e/i18n.ts';
import { createPages } from '@learn/platform-web/e2e/pages.ts';
import type {
  LogicAction,
  LogicContent,
  LogicExerciseDef,
  LogicLesson,
  LogicSeriesGame,
  LogicState,
} from '@learn/subject-logic';
import { LOGIC_CHARACTERS, kindOf } from '@learn/subject-logic';
import { solutionOf } from '@learn/subject-logic/testing';
import { logicKindE2EOf } from '@learn/subject-logic/web/kinds/e2e-registry.ts';
// Node's ESM loader (specs run straight under Playwright, outside Vite) requires this attribute for a JSON import.
import rawContent from '@learn/subject-logic/dist/content.json' with { type: 'json' };
import en from '@learn/subject-logic/dist/locales/en.json' with { type: 'json' };
import { getSoleProfileId, withAppStorage } from '../kit/storage.ts';

/** The logic locale's texts, resolved as the app renders them (`lessons:pat-repeat.title`, `cards.erase`). */
export const { contentText, interpolate } = createE2ETexts({ en });

/** The shared page flows bound to the logic subject's Home title and locale. */
export const {
  completeFirstRun,
  completeFirstRunToPlacementOffer,
  dismissCelebrationIfShown,
  pickProfileFromPicker,
  openSubject,
  startLessonToFirstGuided,
} = createPages({
  appTitle: contentText('app.title'),
  texts: { contentText },
  subjectId: 'logic',
});

// The content build validates this shape (invalid content fails `pnpm build`), so this is a type conversion, not a runtime check.
const content = rawContent as unknown as LogicContent;

export function findLesson(id: string): LogicLesson {
  const lesson = content.lessons.find((entry) => entry.id === id);
  if (!lesson) throw new Error(`logic content is missing lesson "${id}"`);
  return lesson;
}

export function findMiniGame(id: string): LogicSeriesGame {
  const game = content.minigames.find((entry) => entry.id === id);
  if (!game) throw new Error(`logic content is missing mini-game "${id}"`);
  return game;
}

/** The lessons of one world in Journey order. */
export function worldLessons(worldId: string): readonly LogicLesson[] {
  return content.lessons
    .filter((lesson) => lesson.world === worldId)
    .sort((a, b) => a.order - b.order);
}

/** Escapes regex metacharacters so `text` can be embedded literally in a `RegExp` source. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Accessible name of a lesson's Journey node for `status`: the lesson's title, or for the first lesson of a character the character's
 * name plus a wildcarded topic word ("Pip the Puzzler"; only app UI code maps character to topic, and a later lesson of the same
 * character shows its own title, so no two nodes share a label).
 */
export function journeyNodeName(lesson: LogicLesson, status: 'current' | 'locked'): RegExp {
  const firstOfCharacter = [...content.lessons]
    .filter((entry) => entry.character === lesson.character)
    .sort((a, b) => a.order - b.order)[0];
  const name =
    LOGIC_CHARACTERS[lesson.character] !== undefined && firstOfCharacter?.id === lesson.id
      ? `${escapeRegExp(contentText(`characters:${lesson.character}.name`))} the .+`
      : escapeRegExp(contentText(lesson.titleKey));
  const pattern = interpolate(contentText('journey:ui.node-name'), {
    name,
    status: escapeRegExp(contentText(`journey:ui.status-${status}`)),
  });
  return new RegExp(`^${pattern}$`);
}

/** Opens the Journey's tab of a world ("1 Pattern Pond": its number and title). */
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
  game: Pick<LogicSeriesGame, 'titleKey'>,
  status: 'available' | 'locked' | 'won',
): string {
  return interpolate(contentText('journey:ui.world-boss-name'), {
    title: contentText(game.titleKey),
    status: contentText(`journey:ui.boss-status-${status}`),
  });
}

/**
 * Folds `actions` over `def`'s own kind, from `from` (a fresh state by default): computes each step purely (`kind.act`, the same call
 * the app's reducer makes) and drives the UI to reproduce it through the kind's e2e driver. Returns the state it ends in.
 */
async function runActions(
  page: Page,
  def: LogicExerciseDef,
  actions: readonly LogicAction[],
  from: LogicState = kindOf(def).init(def),
): Promise<LogicState> {
  const kind = kindOf(def);
  const driver = logicKindE2EOf(def.type);
  let state = from;
  for (const action of actions) {
    const before = state;
    const { state: next, outcome } = kind.act(before, action, null);
    await driver.perform(page, action, { def, before, outcome, text: contentText });
    state = next;
  }
  return state;
}

/** The kind's own wrong try (`wrongAction`: another card, a wrong number) and its own solution, as pure actions. */
export function wrongActionsOf(def: LogicExerciseDef): readonly LogicAction[] {
  return solutionOf(def).wrongAction?.(def, null) ?? [];
}

export function solutionActionsOf(def: LogicExerciseDef): readonly LogicAction[] {
  return solutionOf(def).solution(def, null);
}

/** Performs `actions` of `def`'s own kind through the UI, from `from` (default: a fresh exercise); the exercise stays on the page,
 * whatever the outcome. */
export function performActions(
  page: Page,
  def: LogicExerciseDef,
  actions: readonly LogicAction[],
  from?: LogicState,
): Promise<LogicState> {
  return runActions(page, def, actions, from);
}

/** Solves any exercise definition through the UI, leaving it on its success panel. */
export async function solveExercise(page: Page, def: LogicExerciseDef): Promise<void> {
  await runActions(page, def, solutionActionsOf(def));
}

/** Solves one guided try or scored exercise, then advances past its success panel. */
export async function completeExercise(page: Page, def: LogicExerciseDef): Promise<void> {
  await solveExercise(page, def);
  await page.getByRole('button', { name: /^Next/ }).click();
}

/** Plays a lesson from its first guided try to its Complete step: every guided try, then every exercise. */
export async function playLesson(page: Page, lesson: LogicLesson): Promise<void> {
  for (const exercise of [...lesson.guided, ...lesson.exercises]) {
    await completeExercise(page, exercise);
  }
}

/** Plays a `series` boss round by round (a round, then Next), leaving its result showing. */
export async function playSeries(page: Page, game: LogicSeriesGame): Promise<void> {
  for (const round of game.rounds) await completeExercise(page, round);
}

/**
 * Seeds `lessons` as mastered (every exercise at 3 stars) and `miniGames` as won (a `MiniGameProgress` with `wins: 1`, 3 stars) in the
 * logic store for the one seeded profile, then reloads and returns to the Logic Home through the picker: what a child who played them
 * in an earlier session would see.
 */
export async function seedMasteredAndReopen(
  page: Page,
  nickname: string,
  lessons: readonly LogicLesson[],
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
    'logic',
  );
  await page.reload();
  await pickProfileFromPicker(page, nickname);
}

/** The saved progress of one mini-game of the logic store (the first profile's), or `undefined` before it was played. */
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
    'logic',
  );
}
