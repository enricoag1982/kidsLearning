// Layout checks of the shared shell screens, for every subject of the app, on a tablet (1024 x 768) and a phone (390 x 844):
//  - Home: no vertical scroll (the page and `main` stay inside the viewport, so My Den and the version line are on screen) with a
//    typical profile (a streak, stars from a finished world), and every Home button is 56 px or more each way;
//  - Journey: the world title never truncates for any world tab (it wraps instead) and the habitat / stars line stays on one line.
// Chromium only (the viewports are set here, so `playwright.config.ts` runs this file in `chromium`).
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { localDayString } from '@learn/platform-core';
// Node's ESM loader (specs run straight under Playwright, outside Vite) requires this attribute for a JSON import.
import chessContent from '@learn/subject-chess/dist/content.json' with { type: 'json' };
import codingContent from '@learn/subject-coding/dist/content.json' with { type: 'json' };
import logicContent from '@learn/subject-logic/dist/content.json' with { type: 'json' };
import mathContent from '@learn/subject-math/dist/content.json' with { type: 'json' };
import {
  completeFirstRun,
  getSoleProfileId,
  openSubject,
  pickProfileFromPicker,
  withAppStorage,
} from './helpers.ts';

interface SeedLesson {
  readonly id: string;
  readonly world: string;
  readonly order: number;
  readonly exercises: readonly { readonly id: string }[];
}

interface SubjectCase {
  readonly id: string;
  /** The Home heading (`app.title`). */
  readonly title: string;
  /** The first world's id: all its lessons but the last are seeded as mastered (a star total, "Start today" offers the last one). */
  readonly firstWorld: string;
  readonly lessons: readonly SeedLesson[];
}

// The content build validates these shapes (invalid content fails `pnpm build`), so these are type conversions, not runtime checks.
const lessonsOf = (content: unknown): readonly SeedLesson[] =>
  (content as { readonly lessons: readonly SeedLesson[] }).lessons;

const SUBJECTS: readonly SubjectCase[] = [
  { id: 'chess', title: 'Chess', firstWorld: 'board', lessons: lessonsOf(chessContent) },
  { id: 'math', title: 'Math', firstWorld: 'number-meadow', lessons: lessonsOf(mathContent) },
  { id: 'coding', title: 'Coding', firstWorld: 'meadow-steps', lessons: lessonsOf(codingContent) },
  { id: 'logic', title: 'Logic', firstWorld: 'pattern-pond', lessons: lessonsOf(logicContent) },
];

const VIEWPORTS = [
  { name: 'tablet 1024 x 768', width: 1024, height: 768 },
  { name: 'phone 390 x 844', width: 390, height: 844 },
] as const;

/** A fresh install whose child "Kid" has a 12-day streak (shared by every subject) and all but the last lesson of `subject`'s first
 * world mastered, on that subject's Home: the widest header (streak, rank, star total) and a "Start today" offering the last lesson. */
async function reachHome(page: Page, subject: SubjectCase): Promise<void> {
  await completeFirstRun(page, 'Kid');
  const profileId = await getSoleProfileId(page);
  const firstWorld = subject.lessons
    .filter((entry) => entry.world === subject.firstWorld)
    .sort((a, b) => a.order - b.order);
  await withAppStorage(
    page,
    async (repos) => {
      const now = new Date();
      const stamp = now.toISOString();
      await repos.rewards.saveStreak({
        id: 'seed-streak',
        profileId,
        current: 12,
        best: 12,
        lastDay: localDayString(now),
        skipsUsedThisWeek: 0,
        createdAt: stamp,
        updatedAt: stamp,
      });
      for (const lesson of firstWorld.slice(0, -1)) {
        await repos.progress.saveLesson({
          id: `seed-${lesson.id}`,
          profileId,
          lessonId: lesson.id,
          bestStars: Object.fromEntries(
            lesson.exercises.map((exercise) => [exercise.id, 3 as const]),
          ),
          bossStars: 0,
          resumeStep: 0,
          createdAt: stamp,
          updatedAt: stamp,
        });
      }
    },
    subject.id,
  );
  await page.reload();
  await pickProfileFromPicker(page, 'Kid');
  await openSubject(page, subject.id, subject.title);
  await expect(page.getByTestId('stars-pill')).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  test.describe(`shell fit at ${viewport.name}`, () => {
    test.describe.configure({ mode: 'parallel' });
    test.use({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: true });

    for (const subject of SUBJECTS) {
      test(`${subject.title} Home: no scroll, every button 56 px or more`, async ({ page }) => {
        test.setTimeout(60_000);
        await reachHome(page, subject);
        await expect(page.getByTestId('streak-pill')).toBeVisible();

        const measure = () =>
          page.evaluate(() => {
            const main = document.querySelector('main');
            const mainOver = main === null ? 0 : main.scrollHeight - main.clientHeight;
            const pageOver = document.documentElement.scrollHeight - window.innerHeight;
            const mainBottom = main === null ? 0 : main.getBoundingClientRect().bottom;
            const buttons = [...document.querySelectorAll('main button')]
              .map((button) => {
                const box = button.getBoundingClientRect();
                return {
                  name: button.getAttribute('aria-label') ?? button.textContent.trim(),
                  side: Math.min(box.width, box.height),
                  bottom: box.bottom,
                };
              })
              .filter((button) => button.side > 0);
            return { mainOver, pageOver, mainBottom, innerHeight: window.innerHeight, buttons };
          });

        // Polled: fonts and the Owl line settle after the first paint.
        await expect
          .poll(
            async () => {
              const m = await measure();
              return Math.max(m.mainOver, m.pageOver, m.mainBottom - m.innerHeight);
            },
            { message: `${subject.title} Home: px past the screen` },
          )
          .toBeLessThanOrEqual(1);

        const { buttons, innerHeight } = await measure();
        expect(buttons.length).toBeGreaterThanOrEqual(4);
        for (const button of buttons) {
          expect(
            button.side,
            `${subject.title} Home: "${button.name}" side`,
          ).toBeGreaterThanOrEqual(56);
          expect(
            button.bottom,
            `${subject.title} Home: "${button.name}" bottom`,
          ).toBeLessThanOrEqual(innerHeight);
        }
      });

      test(`${subject.title} Journey: the world title never truncates`, async ({ page }) => {
        test.setTimeout(60_000);
        await reachHome(page, subject);
        await page.getByRole('button', { name: /Journey/ }).click();
        const title = page.getByTestId('journey-world-title');
        const meta = page.getByTestId('journey-world-meta');
        const tabs = page.getByTestId('journey-world-tabs').getByRole('button');
        await expect(title).toBeVisible();
        const count = await tabs.count();
        expect(count).toBeGreaterThanOrEqual(1);

        for (let index = 0; index < count; index += 1) {
          await tabs.nth(index).click();
          const label = await tabs.nth(index).innerText();
          // Not cut: nothing wider or taller than the box (`truncate` clips sideways), and at most 2 lines.
          const fit = await title.evaluate((element) => {
            const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
            return {
              text: element.textContent,
              overWidth: element.scrollWidth - element.clientWidth,
              overHeight: element.scrollHeight - element.clientHeight,
              lines: Math.round(element.getBoundingClientRect().height / lineHeight),
              whiteSpace: getComputedStyle(element).whiteSpace,
              textOverflow: getComputedStyle(element).textOverflow,
            };
          });
          const where = `${subject.title} tab "${label.replace(/\s+/g, ' ')}": "${fit.text}"`;
          expect(fit.overWidth, `${where} cut sideways`).toBeLessThanOrEqual(0);
          expect(fit.overHeight, `${where} cut vertically`).toBeLessThanOrEqual(0);
          expect(fit.textOverflow, `${where} ellipsis`).not.toBe('ellipsis');
          expect(fit.lines, `${where} lines`).toBeLessThanOrEqual(2);
          // The habitat / stars line stays on one line, whole.
          const line = await meta.evaluate((element) => {
            const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
            return {
              lines: Math.round(element.getBoundingClientRect().height / lineHeight),
              overWidth: element.scrollWidth - element.clientWidth,
            };
          });
          expect(line.lines, `${where}: habitat line, lines`).toBe(1);
          expect(line.overWidth, `${where}: habitat line, cut sideways`).toBeLessThanOrEqual(0);
        }
      });
    }
  });
}
