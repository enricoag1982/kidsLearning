// Card-kit and control-row fit on the production build (M15.2: F5, F6, F10, F14). Chromium only (the viewports are set here, so
// `playwright.config.ts` runs this file in `chromium`).
//   - Phone 390 x 844: a card prompt's big text (Logic's step-next number rows, up to 16 characters) stays on one line at 24 px or more;
//     Math's 3-sign `cmp-sign` choice is one row of 3 tiles of 96 px or more; the card kit's Hint and Skip buttons are 64 px tall.
//   - Tablet 1024 x 768: the Coding guided try's four control buttons (Hint, Run, Reset, Skip) keep their label and padding.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { LogicLesson } from '@learn/subject-logic';
import type { MathLesson } from '@learn/subject-math';
import * as coding from './coding/kit.ts';
import * as logic from './logic/kit.ts';
import * as math from './math/kit.ts';

const PHONE = { width: 390, height: 844 } as const;
const TABLET = { width: 1024, height: 768 } as const;

/** What `openLesson` needs of a subject's e2e kit. */
interface LessonKit<L> {
  readonly completeFirstRun: (page: Page, nickname?: string) => Promise<void>;
  readonly seedMasteredAndReopen: (
    page: Page,
    nickname: string,
    lessons: readonly L[],
    miniGames: readonly string[],
  ) => Promise<void>;
  readonly journeyNodeName: (lesson: L, status: 'current') => RegExp;
}

/** Opens `lesson`'s first guided try from a fresh install whose child mastered the lessons `before` it. */
async function openLesson<L>(
  page: Page,
  kit: LessonKit<L>,
  lesson: L,
  before: readonly L[],
): Promise<void> {
  await kit.completeFirstRun(page, 'Kid');
  await kit.seedMasteredAndReopen(page, 'Kid', before, []);
  await page.getByRole('button', { name: /Journey/ }).click();
  await page.getByRole('button', { name: kit.journeyNodeName(lesson, 'current') }).click();
  await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
  await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try
}

/** The number of text lines `locator` draws: distinct tops (more than 4 px apart) of its text's client rects. */
function lineCount(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const tops = Array.from(range.getClientRects(), (rect) => rect.top).sort((a, b) => a - b);
    return tops.filter((top, index) => index === 0 || top - (tops[index - 1] ?? 0) > 4).length;
  });
}

/** A button's height in px (the ledge shadow is not part of the box). */
async function heightOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('no layout for the button');
  return box.height;
}

/** The card kit's Hint and Skip buttons (a guided try) are 64 px tall, like every other card target (F5). */
async function expectCardControlsLarge(page: Page, label: string): Promise<void> {
  for (const name of ['Hint', 'Skip']) {
    const height = await heightOf(page.getByRole('button', { name, exact: true }));
    expect.soft(height, `${label}: ${name} button height`).toBeGreaterThanOrEqual(63.5);
  }
}

/** Resolves once `locator`'s box is the same in two reads 250 ms apart (the board settles in a 200 ms transition after an exercise
 * opens, and the text may sit on one line for a moment on the way). */
async function expectSettled(locator: Locator, label: string): Promise<void> {
  let last = '';
  await expect
    .poll(
      async () => {
        const now = JSON.stringify(await locator.boundingBox());
        const same = now === last;
        last = now;
        return same;
      },
      { message: `${label}: layout settles`, intervals: [250] },
    )
    .toBe(true);
}

/** The big text of an exercise's prompt is one line and 24 px (1.5 rem) or more (F14). */
async function expectBigTextOneLine(page: Page, id: string, big: string): Promise<void> {
  const text = page.getByText(big, { exact: true });
  await expect(text, `${id}: big text "${big}"`).toBeVisible();
  await expectSettled(text, id);
  expect(await lineCount(text), `${id}: "${big}" lines`).toBe(1);
  const size = await text.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(size, `${id}: "${big}" font size`).toBeGreaterThanOrEqual(24);
}

test.describe('card kit on a phone (390 x 844)', () => {
  test.use({ viewport: PHONE, hasTouch: true });

  test('Logic step-next: every number row of Number steps is one line, Hint and Skip are 64 px', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const lesson = logic.findLesson('pat-steps');
    const before = logic.worldLessons(lesson.world).filter((entry) => entry.order < lesson.order);
    await openLesson<LogicLesson>(page, logic, lesson, before);
    const defs = [...lesson.guided, ...lesson.exercises];
    const rows = defs.flatMap((def) => {
      const big = 'prompt' in def ? def.prompt?.big : undefined;
      return big === undefined ? [] : [{ def, big }];
    });
    // The longest row of the lesson (5 numbers and the "?") is among them.
    expect(Math.max(...rows.map((row) => row.big.length))).toBeGreaterThanOrEqual(15);
    await expectCardControlsLarge(page, 'steps guided try');
    for (const def of defs) {
      const row = rows.find((entry) => entry.def === def);
      if (row !== undefined) await expectBigTextOneLine(page, def.id, row.big);
      await logic.completeExercise(page, def);
    }
  });

  test('Math cmp-sign: the < = > tiles are one row of 3, Hint and Skip are 64 px', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const lesson = math.findLesson('pv-compare');
    const before = math.worldLessons(lesson.world).filter((entry) => entry.order < lesson.order);
    await openLesson<MathLesson>(page, math, lesson, before);
    await expectCardControlsLarge(page, 'compare guided try');
    // The guided tries (cmp-g) and the scored cmp-sign ones are 3-sign choices; the lesson's other exercises are not.
    const defs = [...lesson.guided, ...lesson.exercises].filter(
      (def) => def.type === 'choice' && def.options.length === 3,
    );
    expect(defs.length).toBeGreaterThanOrEqual(4);
    for (const def of defs) {
      const tiles = page.locator('[data-size] > button');
      await expect(tiles, `${def.id}: tiles`).toHaveCount(3);
      await expectSettled(tiles.first(), def.id);
      const boxes = await tiles.evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { top: Math.round(box.top), width: box.width, right: box.right };
        }),
      );
      expect.soft(new Set(boxes.map((box) => box.top)).size, `${def.id}: rows`).toBe(1);
      for (const box of boxes) {
        expect.soft(box.width, `${def.id}: tile width`).toBeGreaterThanOrEqual(96);
        expect
          .soft(box.right, `${def.id}: tile inside the screen`)
          .toBeLessThanOrEqual(PHONE.width);
      }
      await math.completeExercise(page, def);
    }
  });
});

test.describe('control rows on a tablet (1024 x 768)', () => {
  test.use({ viewport: TABLET, hasTouch: true });

  test('Coding guided try: Hint, Run, Reset and Skip keep their label and padding, 56 px tall', async ({
    page,
  }) => {
    await coding.completeFirstRun(page, 'Kid');
    await coding.seedLessonsMasteredAndReopen(page, 'Kid', [coding.findLesson('seq-order')]);
    await coding.startToday(page);
    const names = [
      'Hint',
      coding.contentText('coding.buttons.run'),
      coding.contentText('coding.buttons.reset'),
      'Skip',
    ];
    for (const name of names) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button, name).toBeVisible();
      expect.soft(await heightOf(button), `${name}: height`).toBeGreaterThanOrEqual(55.5);
      // The content (icon and label) sits inside the border and padding: 8 px or more on both sides, nothing clipped.
      const fit = await button.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const label = document.createRange();
        label.selectNodeContents(element);
        const content = label.getBoundingClientRect();
        const first = element.firstElementChild?.getBoundingClientRect() ?? content;
        const last = element.lastElementChild?.getBoundingClientRect() ?? content;
        return {
          left: Math.min(first.left, content.left) - box.left,
          right: box.right - Math.max(last.right, content.right),
          clipped: element.scrollWidth - element.clientWidth,
        };
      });
      expect.soft(fit.left, `${name}: padding left`).toBeGreaterThanOrEqual(8);
      expect.soft(fit.right, `${name}: padding right`).toBeGreaterThanOrEqual(8);
      expect.soft(fit.clipped, `${name}: clipped`).toBeLessThanOrEqual(0);
    }
  });
});
