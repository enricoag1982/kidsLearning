import type { Page } from '@playwright/test';
import { MAX_REPEAT, MIN_REPEAT } from '../../core/tiles.ts';
import type { Tile } from '../../core/tiles.ts';
import type { ProgramDef } from '../../core/types.ts';
import { DEFAULT_TIMES } from '../../web/editor/program-draft.ts';
import { fill, tileLabel, trayLabel } from '../../web/kinds/e2e-names.ts';
import type { Text } from '../../web/kinds/e2e-names.ts';
import type { CodingKindE2E } from '../../web/kinds/e2e-registry.ts';
import { sameTile } from '../../core/tiles.ts';
import type { ProgramAction, ProgramOutcome } from './kind.ts';

const click = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('button', { name, exact: true }).click();
};

/** Taps of a repeat's count button from `DEFAULT_TIMES` to `times` (3, 4 … 9, then 2). */
function timesTaps(times: number): number {
  const span = MAX_REPEAT - MIN_REPEAT + 1;
  return (times - DEFAULT_TIMES + span) % span;
}

/** Puts the repeat `tile` into the first empty slot, number `n`: the tray's Repeat, its body tiles, its count; then closes it so the
 * next tile goes after it. */
async function addRepeat(
  page: Page,
  text: Text,
  tile: Extract<Tile, { readonly kind: 'repeat' }>,
  n: number,
  more: boolean,
): Promise<void> {
  await click(page, trayLabel(text, 'repeat'));
  for (const inner of tile.body) {
    await click(page, trayLabel(text, inner.kind));
  }
  let times = DEFAULT_TIMES;
  for (let tap = 0; tap < timesTaps(tile.times); tap += 1) {
    await click(page, fill(text('coding.strip.times'), { n, times }));
    times = times >= MAX_REPEAT ? MIN_REPEAT : times + 1;
  }
  if (more) {
    await click(page, fill(text('coding.strip.fill'), { n }));
  }
}

/** Reproduces `program` in the strip: Reset (the prefilled strip, whatever was tried before), take out the tiles that are in the way,
 * then tap the tray in order, each tile landing in the first empty slot. A prefilled tile that is already right stays. */
async function buildProgram(
  page: Page,
  def: ProgramDef,
  program: readonly Tile[],
  text: Text,
): Promise<void> {
  await click(page, text('coding.buttons.reset'));
  const start = Array.from({ length: def.cap }, (_unused, index) => def.prefilled?.[index] ?? null);
  const keep = start.map((tile, index) => {
    const wanted = program[index];
    return tile !== null && wanted !== undefined && sameTile(tile, wanted);
  });
  for (const [index, tile] of start.entries()) {
    if (tile !== null && keep[index] !== true) {
      if (tile.kind === 'repeat' || def.locked?.includes(index) === true) {
        throw new Error(`program "${def.id}": cannot change prefilled slot ${String(index)}`);
      }
      await click(
        page,
        fill(text('coding.strip.slot-filled'), { n: index + 1, tile: tileLabel(text, tile) }),
      );
    }
  }
  for (const [index, tile] of program.entries()) {
    if (keep[index] === true) continue;
    if (tile.kind === 'repeat') {
      await addRepeat(page, text, tile, index + 1, index + 1 < program.length);
    } else {
      await click(page, trayLabel(text, tile.kind));
    }
  }
}

export const programE2E: CodingKindE2E<ProgramDef, ProgramAction, ProgramOutcome> = {
  async perform(page, action, { def, text }) {
    await buildProgram(page, def, action.program, text);
    await click(page, text('coding.buttons.run'));
  },
};
