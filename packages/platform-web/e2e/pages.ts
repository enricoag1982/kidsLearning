import type { Locator, Page } from '@playwright/test';
import type { E2ETexts } from './i18n.ts';

export interface PageFlows {
  completeFirstRunToPlacementOffer: (page: Page, nickname?: string) => Promise<void>;
  completeFirstRun: (page: Page, nickname?: string) => Promise<void>;
  dismissCelebrationIfShown: (page: Page) => Promise<void>;
  pickProfileFromPicker: (page: Page, nickname: string) => Promise<void>;
  /** Opens `subjectId` from the subjects hub or, from anywhere else, through Home's "Subjects" button; a placement offer on
   * a fresh subject is declined. Waits for that subject's Home (`homeTitle`, default the bound subject's `appTitle`). */
  openSubject: (page: Page, subjectId: string, homeTitle?: string) => Promise<void>;
  startLessonToFirstGuided: (page: Page) => Promise<void>;
  openParentArea: (page: Page) => Promise<void>;
}

export interface PageFlowOptions {
  /** The subject's Home heading (`app.title`: "Chess", "Math"), awaited after first run and after picking a profile. */
  readonly appTitle: string;
  readonly texts: Pick<E2ETexts, 'contentText'>;
  /** The app hosts several subjects: first run and the profile picker lead to the subjects hub, and the flows go on through
   * this subject's tile (`subject-tile-<subjectId>`) to its Home. Absent: no hub (a single-subject app). */
  readonly subjectId?: string;
}

/** The subject-neutral page flows (first run, picker, celebration, parent area), bound to one app and, in a multi-subject app,
 * to one of its subjects. */
export function createPages({ appTitle, texts, subjectId }: PageFlowOptions): PageFlows {
  const { contentText } = texts;
  const homeHeading = (page: Page, title: string): Locator =>
    page.getByRole('heading', { level: 1, name: title, exact: true });
  const waitForHome = (page: Page): Promise<void> => homeHeading(page, appTitle).waitFor();
  const subjectTile = (page: Page, id: string): Locator => page.getByTestId(`subject-tile-${id}`);
  const declineOfferButton = (page: Page): Locator =>
    page.getByRole('button', { name: contentText('placement.offer-no') });

  // A tile tap lands on the subject's Home, or on the placement offer first when the subject is fresh for this profile
  // (once per app session): that offer is declined.
  async function settleOnHome(page: Page, homeTitle: string): Promise<void> {
    const home = homeHeading(page, homeTitle);
    const decline = declineOfferButton(page);
    await home.or(decline).first().waitFor();
    if (await decline.isVisible()) {
      await decline.click();
      await home.waitFor();
    }
  }

  async function openSubject(page: Page, id: string, homeTitle = appTitle): Promise<void> {
    const tile = subjectTile(page, id);
    if (!(await tile.isVisible())) {
      await page.getByRole('button', { name: 'Subjects', exact: true }).click();
    }
    await tile.click();
    await settleOnHome(page, homeTitle);
  }

  // Stops at the placement offer, so specs that exercise placement can continue from there.
  async function completeFirstRunToPlacementOffer(page: Page, nickname = 'Kid'): Promise<void> {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start setup' }).click();

    await page.getByLabel('Parent code', { exact: true }).fill('1234');
    await page.getByLabel('Repeat parent code').fill('1234');
    await page.getByRole('button', { name: 'Save parent code' }).click();

    await page.getByRole('button', { name: 'Next' }).click(); // Saved -> new player
    await page.getByPlaceholder('Your name').fill(nickname);
    await page.getByRole('button', { name: 'Next' }).click(); // nickname -> avatar
    await page.getByRole('button', { name: "Let's play!" }).click();
    if (subjectId !== undefined) await subjectTile(page, subjectId).click(); // hub -> the subject

    await page.getByText(contentText('placement.offer-question')).waitFor();
  }

  // Fresh install to Home, declining placement: the landing every spec that needs a profile relies on.
  async function completeFirstRun(page: Page, nickname = 'Kid'): Promise<void> {
    await completeFirstRunToPlacementOffer(page, nickname);
    await declineOfferButton(page).click();
    await waitForHome(page);
  }

  // A no-op without an overlay; loops because dismissing one can queue a second (at most 2 per sitting).
  async function dismissCelebrationIfShown(page: Page): Promise<void> {
    const celebration = page.getByRole('alertdialog', { name: 'New badge!' });
    for (let i = 0; i < 2; i += 1) {
      if (!(await celebration.isVisible().catch(() => false))) return;
      await celebration.getByRole('button', { name: 'Continue' }).click();
    }
  }

  // Every reload shows the picker again, so specs that reload call this to get back to Home.
  async function pickProfileFromPicker(page: Page, nickname: string): Promise<void> {
    await page.getByRole('button', { name: new RegExp(nickname) }).click();
    if (subjectId === undefined) {
      await waitForHome(page);
      return;
    }
    // Picker -> hub -> the subject's tile -> Home (a subject without progress offers placement first).
    await subjectTile(page, subjectId).click();
    await settleOnHome(page, appTitle);
  }

  // From a fresh install: today's lesson, Story -> Demo -> first guided try.
  async function startLessonToFirstGuided(page: Page): Promise<void> {
    await completeFirstRun(page);
    await page.getByRole('button', { name: /Start/ }).click();
    await page.getByRole('button', { name: /Let me try/ }).click(); // Story -> Demo
    await page.getByRole('button', { name: /^Next/ }).click(); // Demo -> first guided try
  }

  // From the picker with a parent lock set: opens the parent area with the standard test code.
  async function openParentArea(page: Page): Promise<void> {
    await page.getByRole('button', { name: /Grown-ups/ }).click();
    await page.getByLabel('Parent code', { exact: true }).fill('1234');
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('heading', { name: 'Parent area' }).waitFor();
  }

  return {
    completeFirstRunToPlacementOffer,
    completeFirstRun,
    dismissCelebrationIfShown,
    pickProfileFromPicker,
    openSubject,
    startLessonToFirstGuided,
    openParentArea,
  };
}
