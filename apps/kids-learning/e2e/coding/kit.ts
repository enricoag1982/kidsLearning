// The coding e2e kit: the platform's page flows bound to the Coding subject of the Kids Learning app (through the subjects hub) and
// its locale, plus drivers that play any exercise from its kind's `solution()` through the kind's own e2e driver (one path for every
// kind), seed lessons as mastered in the coding store, and play a lesson or a series round by round.
import type { Page } from '@playwright/test';
import { createE2ETexts } from '@learn/platform-web/e2e/i18n.ts';
import { createPages } from '@learn/platform-web/e2e/pages.ts';
import type {
  CodingAction,
  CodingExerciseDef,
  CodingLesson,
  CodingSeries,
} from '@learn/subject-coding';
import { kindOf } from '@learn/subject-coding';
import { solutionOf } from '@learn/subject-coding/testing';
import { codingKindE2EOf } from '@learn/subject-coding/web/kinds/e2e-registry.ts';
// Node's ESM loader (specs run straight under Playwright, outside Vite) requires this attribute for a JSON import.
import rawContent from '@learn/subject-coding/dist/content.json' with { type: 'json' };
import en from '@learn/subject-coding/dist/locales/en.json' with { type: 'json' };
import { getSoleProfileId, withAppStorage } from '../kit/storage.ts';

/** The coding locale's texts, resolved as the app renders them (`lessons:ask-reach`, `coding.buttons.run`). */
export const { contentText, interpolate } = createE2ETexts({ en });

/** The shared page flows bound to the coding subject's Home title and locale. */
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
  subjectId: 'coding',
});

// The content build validates this shape (invalid content fails `pnpm build`), so this is a type conversion, not a runtime check.
const content = rawContent as unknown as {
  readonly lessons: readonly CodingLesson[];
  readonly minigames: readonly CodingSeries[];
};

export function findLesson(id: string): CodingLesson {
  const lesson = content.lessons.find((entry) => entry.id === id);
  if (!lesson) throw new Error(`coding content is missing lesson "${id}"`);
  return lesson;
}

export function findMiniGame(id: string): CodingSeries {
  const game = content.minigames.find((entry) => entry.id === id);
  if (!game) throw new Error(`coding content is missing mini-game "${id}"`);
  return game;
}

/** Accessible name of the world boss's Journey node for `status`. */
export function worldBossNodeName(
  game: CodingSeries,
  status: 'available' | 'locked' | 'won',
): string {
  return interpolate(contentText('journey:ui.world-boss-name'), {
    title: contentText(game.titleKey),
    status: contentText(`journey:ui.boss-status-${status}`),
  });
}

/**
 * Folds `actions` over `def`'s own kind: computes each step purely (`kind.act`, the same call the app's reducer makes) and drives
 * the UI to reproduce it through the kind's e2e driver.
 */
async function runActions(
  page: Page,
  def: CodingExerciseDef,
  actions: readonly CodingAction[],
): Promise<void> {
  const kind = kindOf(def);
  const driver = codingKindE2EOf(def.type);
  let state = kind.init(def);
  for (const action of actions) {
    const before = state;
    const { state: next, outcome } = kind.act(before, action, null);
    await driver.perform(page, action, { def, before, outcome, text: contentText });
    state = next;
  }
}

/**
 * A guided predict starts with a hint's replay of its first steps, and a replay ignores taps while it plays (the tiles under the
 * animal are lit). Waits for the replay to begin, then to end, before the first tap.
 */
async function waitForReplayToEnd(page: Page): Promise<void> {
  const lit = page.locator('[data-active="true"]').first();
  await lit.waitFor({ state: 'attached', timeout: 2000 }).catch(() => undefined);
  await lit.waitFor({ state: 'detached', timeout: 10_000 });
}

/** The wrong try of `def` (one action that costs exactly one error), played through the UI. */
export async function playWrongTry(page: Page, def: CodingExerciseDef): Promise<void> {
  await runActions(page, def, solutionOf(def).wrongAction?.(def, null) ?? []);
}

/** Solves any exercise definition through the UI, leaving it on its success panel. `guided`: a guided predict waits for its replay. */
export async function solveExercise(
  page: Page,
  def: CodingExerciseDef,
  guided = false,
): Promise<void> {
  if (guided && def.type === 'predict') await waitForReplayToEnd(page);
  await runActions(page, def, solutionOf(def).solution(def, null));
}

/** Solves one guided try or scored exercise, then advances past its success panel. */
export async function completeExercise(
  page: Page,
  def: CodingExerciseDef,
  guided = false,
): Promise<void> {
  await solveExercise(page, def, guided);
  await page.getByRole('button', { name: /^Next/ }).click();
}

/** Plays a lesson from its first guided try to its Complete step: every guided try, then every exercise. */
export async function playLesson(page: Page, lesson: CodingLesson): Promise<void> {
  for (const exercise of lesson.guided) {
    await completeExercise(page, exercise, true);
  }
  for (const exercise of lesson.exercises) {
    await completeExercise(page, exercise);
  }
}

/** Plays a series round by round (a round, then Next), leaving the round after the last showing. */
export async function playRounds(page: Page, game: CodingSeries, rounds: number): Promise<void> {
  for (const round of game.rounds.slice(0, rounds)) {
    await completeExercise(page, round);
  }
}

/**
 * Seeds `lessons` as mastered in the coding store (every exercise at 3 stars) for the one seeded profile, then reloads and returns to
 * the Coding Home through the picker: what a child who played them in an earlier session would see.
 */
export async function seedLessonsMasteredAndReopen(
  page: Page,
  nickname: string,
  lessons: readonly CodingLesson[],
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
    },
    'coding',
  );
  await page.reload();
  await pickProfileFromPicker(page, nickname);
}

/** Home's Start (today's lesson): Story, then Demo, then the first guided try is showing. */
export async function startToday(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Start/ }).click();
  await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
  await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try
}
