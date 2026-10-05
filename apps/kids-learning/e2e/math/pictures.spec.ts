// The math cards' pictures and the boards sized for the screen (M15.3, follow-ups F11-F13), measured in the deployed app at a tablet
// (1024 x 768) and a phone (390 x 844): Race to 20's title shown once with big stones, the number-line card as wide as the board slot
// under a smaller prompt card, the groups drawn as clusters, and the small number lines of `round-ten` and `bridge-add`. Chromium only,
// like the other math specs.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import {
  completeExercise,
  completeFirstRun,
  contentText,
  findDuel,
  findLesson,
  journeyNodeName,
  openJourneyWorld,
  seedMasteredAndReopen,
  worldBossNodeName,
  worldLessons,
  worldsBefore,
} from './kit.ts';

const NICKNAME = 'Kid';
const duel = findDuel('race-to-20');

const SCREENS = [
  { name: 'tablet 1024 x 768', width: 1024, height: 768 },
  { name: 'phone 390 x 844', width: 390, height: 844 },
] as const;

/** A box that is on the page (`boundingBox` is `null` otherwise): the spec fails there instead of passing on a missing element. */
async function boxOf(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('the element is not on the page');
  return box;
}

/** Fresh install with everything before `lessonId` mastered, then the lesson from the Journey to its first guided try. */
async function openFirstTry(page: Page, lessonId: string): Promise<void> {
  const lesson = findLesson(lessonId);
  const earlier = worldsBefore(lesson.world);
  const sameWorld = worldLessons(lesson.world).filter((entry) => entry.order < lesson.order);
  await completeFirstRun(page, NICKNAME);
  await seedMasteredAndReopen(page, NICKNAME, [...earlier.lessons, ...sameWorld], earlier.bosses);
  await page.getByRole('button', { name: /Journey/ }).click();
  await page.getByRole('button', { name: journeyNodeName(lesson, 'current') }).click();
  await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
  await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try
}

/** The forest's six lessons and every earlier world mastered, the Journey on the forest, the world boss node (Race to 20) tapped. */
async function openRace(page: Page): Promise<void> {
  const forest = worldLessons('times-forest');
  const earlier = worldsBefore('times-forest');
  await completeFirstRun(page, NICKNAME);
  await seedMasteredAndReopen(page, NICKNAME, [...earlier.lessons, ...forest], earlier.bosses);
  await page.getByRole('button', { name: /Journey/ }).click();
  await openJourneyWorld(page, 3, 'times-forest');
  await page.getByRole('button', { name: worldBossNodeName(duel, 'available') }).click();
  await expect(
    page.getByRole('heading', { name: contentText(duel.titleKey), level: 2 }),
  ).toBeVisible();
}

for (const screen of SCREENS) {
  test.describe(`Math pictures and boards, ${screen.name}`, () => {
    test.use({ viewport: { width: screen.width, height: screen.height } });
    const tablet = screen.width >= 1024;

    test('Race to 20 shows its title once; the stones are 56 px tall on a tablet (two rows of 11 and 10), at least 32 px wide on a phone (the start, then two rows of 10)', async ({
      page,
    }) => {
      await openRace(page);
      const title = contentText(duel.titleKey);
      await expect(page.getByText(title, { exact: true })).toHaveCount(1);

      const stone = async (n: number) => boxOf(page.locator(`[data-stone="${String(n)}"]`));
      // Stone 0 carries the token (drawn bigger): the rows are read from the stones beside it.
      const [first, one, ten, eleven, twenty, seven] = [
        await stone(0),
        await stone(1),
        await stone(10),
        await stone(11),
        await stone(20),
        await stone(7),
      ];
      expect(seven.width).toBeGreaterThanOrEqual(tablet ? 44 : 32);
      expect(seven.height).toBeGreaterThanOrEqual(tablet ? 56 : 44);
      // Two rows: 11 stones then 10 on a tablet; the start alone, then 10 and 10 on a phone.
      if (tablet) {
        expect(Math.abs(ten.y - one.y)).toBeLessThan(2);
        expect(Math.abs(first.y - one.y)).toBeLessThan(6);
        expect(eleven.y).toBeGreaterThan(one.y + one.height - 1);
        expect(Math.abs(twenty.y - eleven.y)).toBeLessThan(2);
      } else {
        expect(Math.abs(one.y - ten.y)).toBeLessThan(2);
        expect(one.y).toBeGreaterThan(first.y + first.height - 1);
        expect(eleven.y).toBeGreaterThan(ten.y + ten.height - 1);
        expect(Math.abs(twenty.y - eleven.y)).toBeLessThan(2);
      }
      // Nothing scrolls: the step buttons are on the screen.
      const plusThree = await boxOf(page.getByRole('button', { name: '+3' }));
      expect(plusThree.y + plusThree.height).toBeLessThanOrEqual(screen.height);
    });

    test('the number-line card spans the board slot under a smaller prompt card, its 10 gaps at least 44 px apart on a tablet (a phone keeps its 152 px card)', async ({
      page,
    }) => {
      const lesson = findLesson('pv-line');
      const [first] = lesson.guided;
      expect(first?.type).toBe('number-line');
      await openFirstTry(page, 'pv-line');

      const card = await boxOf(page.getByTestId('number-line'));
      const slot = await page.evaluate(() => {
        const line = document.querySelector('[data-testid="number-line"]');
        const rect = (element: Element | null | undefined): [number, number] => {
          const found = element?.getBoundingClientRect();
          return [found?.width ?? 0, found?.height ?? 0];
        };
        // The prompt card sits in the sibling slot above the line card's slot, both inside the board.
        return {
          prompt: rect(line?.parentElement?.previousElementSibling?.firstElementChild),
          board: rect(line?.parentElement?.parentElement),
        };
      });
      const [promptWidth, promptHeight] = slot.prompt;
      expect(Math.abs(card.width - slot.board[0])).toBeLessThan(2);
      expect(Math.abs(promptWidth - slot.board[0])).toBeLessThan(2);
      const gap =
        (await boxOf(page.getByTestId('number-line-tick-100'))).x -
        (await boxOf(page.getByTestId('number-line-tick-0'))).x;
      if (tablet) {
        expect(card.width).toBeGreaterThanOrEqual(600);
        expect(card.height).toBeGreaterThan(promptHeight);
        expect(gap).toBeGreaterThanOrEqual(44);
        // The ticks are drawn bigger with the card.
        expect((await boxOf(page.getByTestId('number-line-tick-0'))).height).toBeGreaterThanOrEqual(
          40,
        );
      } else {
        expect(card.height).toBeCloseTo(152, 0);
        expect(card.width).toBeGreaterThanOrEqual(300);
      }
    });

    test('groups: the card says "3 groups of 2" and draws 3 clusters of 2 shapes, named as one picture', async ({
      page,
    }) => {
      const lesson = findLesson('mt-groups');
      const [first] = lesson.guided;
      const shapes = first?.prompt?.shapes ?? [];
      expect(shapes).toHaveLength(3);
      await openFirstTry(page, 'mt-groups');

      await expect(page.getByText('3 groups of 2', { exact: true })).toBeVisible();
      const picture = page.getByRole('img', { name: /^Row of shapes: / });
      await expect(picture).toBeVisible();
      await expect(picture).toHaveAttribute(
        'aria-label',
        'Row of shapes: 2 blue diamonds, 2 blue diamonds, 2 blue diamonds',
      );
      await expect(picture.locator('svg')).toHaveCount(6);
      await expect(page.locator('[data-count="2"]')).toHaveCount(3);
      // Each drawn shape is big enough to count (the largest cluster, 9, would be a third of this).
      const cluster = await boxOf(page.locator('[data-count="2"]').first());
      expect(cluster.width).toBeGreaterThanOrEqual(tablet ? 56 : 44);
    });

    test('round-ten: the card draws the number between its two tens on a line, the dot where the number is', async ({
      page,
    }) => {
      const lesson = findLesson('pv-round');
      const line = lesson.guided[0]?.prompt?.line;
      if (line === undefined) throw new Error('the first pv-round try has no line');
      expect(line.step).toBe(1);
      await openFirstTry(page, 'pv-round');

      const [mark] = line.marks;
      const picture = page.getByRole('img', {
        name: `Number line from ${String(line.from)} to ${String(line.to)}, a dot at ${String(mark)}`,
      });
      await expect(picture).toBeVisible();
      await expect(picture.locator('[data-tick]')).toHaveCount(11);
      await expect(picture.locator('[data-mark]')).toHaveCount(1);
      await expect(picture.locator(`[data-end="${String(line.from)}"]`)).toHaveText(
        String(line.from),
      );
      await expect(picture.locator(`[data-end="${String(line.to)}"]`)).toHaveText(String(line.to));
      const box = await boxOf(picture);
      expect(box.width).toBeGreaterThanOrEqual(tablet ? 400 : 250);
      // The 10 gaps are at least 20 px apart even on a phone.
      expect(box.width / 10).toBeGreaterThanOrEqual(20);
    });

    test('bridge-add: the card draws the start and the next ten on a line to the ten after the total, never a dot on the answer', async ({
      page,
    }) => {
      const lesson = findLesson('mm-bridge');
      const first = lesson.guided[0];
      const line = first?.prompt?.line;
      if (first === undefined || line === undefined) throw new Error('mm-bridge has no line');
      expect(first.type).toBe('number-entry');
      await openFirstTry(page, 'mm-bridge');

      const picture = page.getByRole('img', {
        name: `Number line from ${String(line.from)} to ${String(line.to)}, dots at ${line.marks.join(', ')}`,
      });
      await expect(picture).toBeVisible();
      await expect(picture.locator('[data-mark]')).toHaveCount(2);
      for (const mark of line.marks) {
        await expect(picture.locator(`[data-mark="${String(mark)}"]`)).toHaveCount(1);
      }
      if (first.type === 'number-entry') {
        await expect(picture.locator(`[data-mark="${String(first.answer)}"]`)).toHaveCount(0);
        await expect(picture.locator(`[data-end="${String(first.answer)}"]`)).toHaveCount(0);
      }
      // The pictured tries still play: the answer is typed and checked.
      await completeExercise(page, first);
    });
  });
}
