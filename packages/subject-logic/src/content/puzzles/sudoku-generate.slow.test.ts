// `pnpm test:slow`: the generator sets over 1 000 seeds each, with the timing budget (6 × 6: mean per puzzle ≤ 40 ms).
import { describe, expect, it } from 'vitest';
import { GENERATOR_SETS, checkSet, type SetStats } from './sudoku-generate-sets.ts';

const SEEDS = 1000;
const MEAN_MS_6X6 = 40;
// The fast test (200 seeds) asserts 100 %; over 1 000 seeds 6 × 6 with 6 empty cells misses 5 within 200 tries (99.5 %: mean 35 tries).
const MIN_SUCCESS = 0.99;

describe('generateSudoku, 1 000 seeds per set', () => {
  const all: SetStats[] = [];
  for (const set of GENERATOR_SETS) {
    for (const empty of set.empties) {
      it(`${String(set.size)} × ${String(set.size)} ${set.focus} (require ${set.require}), ${String(empty)} empty`, () => {
        const stats = checkSet(set, empty, SEEDS);
        all.push(stats);
        expect(stats.ok).toBeGreaterThanOrEqual(SEEDS * MIN_SUCCESS);
        if (set.size === 6) {
          expect(stats.meanMs).toBeLessThanOrEqual(MEAN_MS_6X6);
        }
      });
    }
  }

  it('prints the stats', () => {
    const rows = all.map(
      (stats) =>
        `${stats.label.padEnd(54)} ok ${String(stats.ok)}/${String(stats.seeds)}  tries ${stats.meanTries.toFixed(2)}  ms mean ${stats.meanMs.toFixed(2)} max ${stats.maxMs.toFixed(1)}`,
    );
    console.info(`\n${rows.join('\n')}`);
    expect(all.length).toBeGreaterThan(0);
  });
});
