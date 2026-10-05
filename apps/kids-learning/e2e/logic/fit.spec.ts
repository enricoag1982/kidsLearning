// Layout checks of Logic on the production build, at a tablet (1024 x 768) and a phone (390 x 844): a Venn sort (the Circles lesson, the
// Sorting Sprint's round 5), the Carroll count table and a picture cross never make the lesson `main` scroll, also with an Owl note
// showing (a wrong put, two wrong cells), and the picture's cells stay at 48 px or more; on a phone the Journey brings the current
// world's tab into view. Chromium only (the viewports are set here, so `playwright.config.ts` runs this file in `chromium`).
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { LogicExerciseDef, LogicLesson } from '@learn/subject-logic';
import {
  completeExercise,
  completeFirstRun,
  contentText,
  findLesson,
  findMiniGame,
  journeyNodeName,
  openJourneyWorld,
  performActions,
  seedMasteredAndReopen,
  solutionActionsOf,
  solveExercise,
  worldBossNodeName,
  worldLessons,
  worldsBefore,
  wrongActionsOf,
} from './kit.ts';

const VIEWPORTS = [
  { name: 'tablet 1024 x 768', width: 1024, height: 768 },
  { name: 'phone 390 x 844', width: 390, height: 844 },
] as const;

const WORLD_TWO = worldLessons('sort-shore');
const WORLD_THREE = worldLessons('grid-puzzles');
const BEFORE_TWO = worldsBefore('sort-shore');
const BEFORE_THREE = worldsBefore('grid-puzzles');
const sprint = findMiniGame('sorting-sprint');

/** The lesson `main` (`h-dvh`, `overflow-y-auto`) needs no scrolling, and neither does the page (`e2e/fit.spec.ts`: a scrollable
 * `main` is the "move the page up to reach Next" symptom). Polled: the board settles in a 200 ms transition. */
async function expectNoScroll(page: Page, label: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const main = document.querySelector('main');
          const mainOver = main === null ? 0 : main.scrollHeight - main.clientHeight;
          return Math.max(mainOver, document.documentElement.scrollHeight - window.innerHeight);
        }),
      { message: `${label}: scrolls (px past the screen)` },
    )
    .toBeLessThanOrEqual(1);
}

/** The smallest side, in px, of the elements matching `selector` (`Infinity` when there are none). */
function smallestSide(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluateAll((elements) =>
    Math.min(
      Infinity,
      ...elements.map((element) => {
        const box = element.getBoundingClientRect();
        return Math.min(box.width, box.height);
      }),
    ),
  );
}

async function expectAtLeast(
  page: Page,
  selector: string,
  min: number,
  label: string,
): Promise<void> {
  await expect
    .poll(() => smallestSide(page, selector), { message: label })
    .toBeGreaterThanOrEqual(min);
}

/** A fresh install whose child has `lessons` mastered and `bosses` won. */
async function reach(
  page: Page,
  lessons: readonly LogicLesson[],
  bosses: readonly string[],
): Promise<void> {
  await completeFirstRun(page, 'Kid');
  await seedMasteredAndReopen(page, 'Kid', lessons, bosses);
}

/** From the Journey: opens `lesson`'s current node, then its story and demo, down to the first guided try. */
async function openLesson(page: Page, lesson: LogicLesson): Promise<void> {
  await page.getByRole('button', { name: /Journey/ }).click();
  await page.getByRole('button', { name: journeyNodeName(lesson, 'current') }).click();
  await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
  await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try
}

/** Puts a wrong card (a wrong box for the selected card) and waits for its box to flash: the Owl's note is in the bubble. */
async function putWrong(page: Page, def: LogicExerciseDef) {
  const state = await performActions(page, def, wrongActionsOf(def));
  await expect(page.locator('[data-zone][data-wrong="true"]')).toHaveCount(1);
  return state;
}

/** A group exercise with boxes: zone buttons and pool tiles are 56 px or more, nothing scrolls, also with the wrong-put note. Returns
 * the state after that wrong put; the exercise is still open. */
async function expectGroupFits(page: Page, def: LogicExerciseDef, label: string) {
  await expectAtLeast(page, '[data-zone]', 56, `${label}: zone buttons`);
  await expectAtLeast(page, '[role="group"] > button[aria-pressed]', 56, `${label}: pool tiles`);
  await expectNoScroll(page, label);
  const state = await putWrong(page, def);
  await expectNoScroll(page, `${label}, wrong put with its note`);
  return state;
}

for (const viewport of VIEWPORTS) {
  test.describe(`fit at ${viewport.name}`, () => {
    test.describe.configure({ mode: 'parallel' });
    test.use({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: true });

    test('Circles: a Venn of 4 to 7 cards fits, with and without the wrong-put note', async ({
      page,
    }) => {
      const circles = findLesson('cls-circles');
      await reach(page, [...BEFORE_TWO.lessons, ...WORLD_TWO.slice(0, 3)], BEFORE_TWO.bosses);
      await openLesson(page, circles);
      for (const def of [...circles.guided, ...circles.exercises]) {
        const venn = def.type === 'group' && def.layout === 'venn';
        expect(venn, def.id).toBe(true);
        const state = await expectGroupFits(page, def, def.id);
        await performActions(page, def, solutionActionsOf(def), state);
        if (def.id === circles.exercises[circles.exercises.length - 1]?.id) break;
        await page.getByRole('button', { name: /^Next/ }).click();
      }
    });

    test('Sorting Sprint round 5 (a Venn) fits, with and without the wrong-put note', async ({
      page,
    }) => {
      await reach(page, [...BEFORE_TWO.lessons, ...WORLD_TWO], BEFORE_TWO.bosses);
      await page.getByRole('button', { name: /Journey/ }).click();
      await page.getByRole('button', { name: worldBossNodeName(sprint, 'available') }).click();
      const last = sprint.rounds.length - 1;
      for (const [index, round] of sprint.rounds.entries()) {
        if (index < last) {
          await completeExercise(page, round);
          continue;
        }
        expect(round.type === 'group' && round.layout === 'venn').toBe(true);
        await expectGroupFits(page, round, 'Sorting Sprint round 5');
      }
    });

    test('Two boxes: the Carroll count table fits, a placed count cluster is 40 px or more', async ({
      page,
    }) => {
      const boxes = findLesson('cls-boxes');
      const count = boxes.exercises.find((def) => def.id.startsWith('car-kind-count'));
      if (count?.type !== 'group' || count.layout !== 'carroll') {
        throw new Error('cls-boxes has no Carroll count exercise');
      }
      await reach(page, [...BEFORE_TWO.lessons, ...WORLD_TWO.slice(0, 2)], BEFORE_TWO.bosses);
      await openLesson(page, boxes);
      for (const def of [...boxes.guided, ...boxes.exercises]) {
        if (def.id !== count.id) {
          await solveExercise(page, def);
          await page.getByRole('button', { name: /^Next/ }).click();
          continue;
        }
        const state = await expectGroupFits(page, def, def.id);
        // Two cards of the table placed: their clusters (a count of 5 or more) are 40 px boxes, and nothing scrolls.
        await performActions(page, def, solutionActionsOf(def).slice(0, 2), state);
        await expectAtLeast(page, '[data-zone] [data-count]', 40, 'placed clusters');
        await expectNoScroll(page, `${def.id}, two cards placed`);
        break;
      }
    });

    test('Picture cross: 5 x 5 cells are 48 px or more and nothing scrolls, also with the easier offer', async ({
      page,
    }) => {
      const pictures = findLesson('grd-pixels');
      const offered = pictures.exercises[pictures.exercises.length - 1];
      if (offered === undefined || (pictures.variants ?? []).length === 0) {
        throw new Error('grd-pixels: the last scored picture should offer an easier one');
      }
      await reach(
        page,
        [...BEFORE_THREE.lessons, ...WORLD_THREE.filter((entry) => entry.id !== pictures.id)],
        BEFORE_THREE.bosses,
      );
      await openLesson(page, pictures);
      // The guided pictures: the first has a 3-line column clue (the tallest lane); solved, the second follows; Skip leaves the
      // guided tries for the first scored picture.
      const [snake, rabbit] = pictures.guided;
      if (snake === undefined || rabbit === undefined) throw new Error('grd-pixels guided changed');
      await expectAtLeast(page, '[data-testid^="grid-cell-"]', 48, `${snake.id}: cells`);
      await expectNoScroll(page, snake.id);
      await completeExercise(page, snake);
      await expectAtLeast(page, '[data-testid^="grid-cell-"]', 48, `${rabbit.id}: cells`);
      await expectNoScroll(page, rabbit.id);
      await page.getByRole('button', { name: 'Skip', exact: true }).click();
      // The scored pictures; the last one (the cat) is the one that offers an easier picture after two wrong cells.
      for (const def of pictures.exercises) {
        await expectAtLeast(page, '[data-testid^="grid-cell-"]', 48, `${def.id}: cells`);
        await expectNoScroll(page, def.id);
        if (def.id === offered.id) {
          // Two wrong cells: the note and the "Easier one" button join the panel, the cells stay 48 px.
          await performActions(page, def, [...wrongActionsOf(def), ...wrongActionsOf(def)]);
          await expect(page.getByRole('button', { name: /Easier one/ })).toBeVisible();
          await expectAtLeast(
            page,
            '[data-testid^="grid-cell-"]',
            48,
            `${def.id}: cells with the offer`,
          );
          await expectNoScroll(page, `${def.id}, easier offer`);
          break;
        }
        await completeExercise(page, def);
      }
    });
  });
}

test.describe('Journey on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('the tab of the current world is in view when the map opens and after another tab was chosen', async ({
    page,
  }) => {
    await reach(page, BEFORE_THREE.lessons, BEFORE_THREE.bosses);
    await page.getByRole('button', { name: /Journey/ }).click();
    const tab = (order: number, worldId: string) =>
      page.getByRole('button', {
        name: `${String(order)} ${contentText(`journey:worlds.${worldId}`)}`,
        exact: true,
      });
    // The strip scrolls sideways and shows two and a half tabs: the whole of `locator` is inside it (and so on the screen).
    const expectInStrip = (locator: Locator, label: string) =>
      expect
        .poll(
          async () => {
            const box = await locator.boundingBox();
            const strip = await locator.locator('..').boundingBox();
            if (box === null || strip === null) return 'no layout';
            const left = box.x - strip.x;
            const right = strip.x + strip.width - (box.x + box.width);
            return left >= -1 && right >= -1
              ? 'in view'
              : `left ${String(left)}, right ${String(right)}`;
          },
          { message: label },
        )
        .toBe('in view');
    // World 3 is the current one: its tab is the last of three, off-screen unless the strip scrolled to it.
    await expectInStrip(tab(3, 'grid-puzzles'), 'tab 3 on open');
    await openJourneyWorld(page, 1, 'pattern-pond');
    await expectInStrip(tab(1, 'pattern-pond'), 'tab 1 after choosing it');
    await openJourneyWorld(page, 3, 'grid-puzzles');
    await expectInStrip(tab(3, 'grid-puzzles'), 'tab 3 after choosing it');
  });
});
