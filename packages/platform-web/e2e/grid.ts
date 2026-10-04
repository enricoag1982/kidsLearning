import type { Locator, Page } from '@playwright/test';
import { parseCellKey } from '@learn/platform-core';
import type { Cell } from '@learn/platform-core';

/** The `GridBoard` cell at column `x`, row `y` (0-based, row 0 on top): a button in tap mode, an image otherwise. */
export function gridCell(page: Page, x: number, y: number): Locator {
  return page.getByTestId(`grid-cell-${String(x)}-${String(y)}`);
}

/** The cell the board's actor stands on, read from its `data-cell` (the board animates the move: this is the destination,
 * the moment the app state changes, not the animation's end). Throws when the board has no actor. */
export async function actorCell(page: Page): Promise<Cell> {
  const key = await page.getByTestId('grid-actor').getAttribute('data-cell');
  if (key === null) throw new Error('GridBoard has no actor (no element with data-cell)');
  return parseCellKey(key);
}
