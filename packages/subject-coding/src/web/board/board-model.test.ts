import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../core/level.ts';
import { run } from '../../core/simulator.ts';
import type { Tile } from '../../core/tiles.ts';
import { boardModel, usesHeading } from './board-model.ts';

// S . . *
// . # . .
// . . . F
const level = parseLevel(['S..*', '.#..', '...F']);
const tiles = (...kinds: Tile['kind'][]): Tile[] => kinds.map((kind) => ({ kind }) as Tile);

describe('boardModel', () => {
  it("at rest: rocks, stars, the flag, the animal at the start facing the level's way, no trail", () => {
    const model = boardModel(level, []);
    expect(model.cells).toEqual({
      '1,1': { wall: true },
      '3,0': { star: true },
      '3,2': { goal: true },
    });
    expect(model.actor).toEqual({ cell: { x: 0, y: 0 }, heading: 'right', bumped: false });
    expect(model.trail).toEqual([]);
  });

  it('follows the steps shown: the animal moves and leaves footprints on the cells it left', () => {
    const { steps } = run(level, tiles('right', 'right', 'down'));
    const model = boardModel(level, steps.slice(0, 2));
    expect(model.actor.cell).toEqual({ x: 2, y: 0 });
    expect(model.trail).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    const all = boardModel(level, steps);
    expect(all.actor.cell).toEqual({ x: 2, y: 1 });
    expect(all.trail).toHaveLength(3);
  });

  it('a star is gone once the animal stood on it', () => {
    const { steps } = run(level, tiles('right', 'right', 'right', 'down'));
    expect(boardModel(level, steps.slice(0, 2)).cells['3,0']).toEqual({ star: true });
    expect(boardModel(level, steps.slice(0, 3)).cells['3,0']).toBeUndefined();
  });

  it('a cell that is a star and the flag shows both', () => {
    const both = parseLevel(['S.F']);
    const model = boardModel({ ...both, stars: [{ x: 2, y: 0 }] }, []);
    expect(model.cells['2,0']).toEqual({ star: true, goal: true });
  });

  it('a footprint is drawn once however often the animal passed, and never under the animal', () => {
    const { steps } = run(level, tiles('right', 'left', 'right', 'left'));
    const model = boardModel(level, steps);
    expect(model.actor.cell).toEqual({ x: 0, y: 0 });
    expect(model.trail).toEqual([{ x: 1, y: 0 }]);
  });

  it('shakes the animal on the bump, which leaves it where it was', () => {
    const { steps } = run(level, tiles('down', 'right'));
    const model = boardModel(level, steps);
    expect(model.actor).toEqual({ cell: { x: 0, y: 1 }, heading: 'right', bumped: true });
    expect(boardModel(level, steps.slice(0, 1)).actor.bumped).toBe(false);
  });

  it('turns the animal in place', () => {
    const { steps } = run(level, tiles('turn-right'));
    const model = boardModel(level, steps);
    expect(model.actor).toEqual({ cell: { x: 0, y: 0 }, heading: 'down', bumped: false });
    expect(model.trail).toEqual([]);
  });
});

describe('usesHeading', () => {
  it('is true for any tile whose meaning depends on where the animal faces', () => {
    for (const kind of ['forward', 'turn-left', 'turn-right', 'jump'] as const) {
      expect(usesHeading([kind]), kind).toBe(true);
    }
  });

  it('is false for the absolute arrows and the repeat alone', () => {
    expect(usesHeading(['up', 'down', 'left', 'right', 'repeat'])).toBe(false);
    expect(usesHeading([])).toBe(false);
  });
});
