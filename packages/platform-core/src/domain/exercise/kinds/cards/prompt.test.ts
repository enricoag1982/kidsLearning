import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHAPE_COUNT,
  DEFAULT_SHAPE_SIZE,
  MAX_PROMPT_SHAPES,
  MAX_SHAPE_COUNT,
  SHAPE_COLOURS,
  SHAPE_KINDS,
  SHAPE_SIZES,
  shapeFacts,
} from './prompt.ts';

describe('shape vocabulary', () => {
  it('has 6 kinds, 6 colours and 5 sizes, the default size among them', () => {
    expect(SHAPE_KINDS).toEqual(['circle', 'square', 'triangle', 'star', 'heart', 'diamond']);
    expect(SHAPE_COLOURS).toEqual(['red', 'blue', 'yellow', 'green', 'purple', 'orange']);
    expect(SHAPE_SIZES).toEqual(['tiny', 'small', 'medium', 'big', 'huge']);
    expect(SHAPE_SIZES).toContain(DEFAULT_SHAPE_SIZE);
    expect([DEFAULT_SHAPE_SIZE, DEFAULT_SHAPE_COUNT, MAX_PROMPT_SHAPES, MAX_SHAPE_COUNT]).toEqual([
      'big',
      1,
      8,
      9,
    ]);
  });
});

describe('shapeFacts', () => {
  it('fills the defaults: size big, count 1', () => {
    expect(shapeFacts({ kind: 'circle', colour: 'red' })).toEqual([
      'kind:circle',
      'colour:red',
      'size:big',
      'count:1',
    ]);
  });

  it('reports the given size and count', () => {
    expect(shapeFacts({ kind: 'star', colour: 'yellow', size: 'tiny', count: 7 })).toEqual([
      'kind:star',
      'colour:yellow',
      'size:tiny',
      'count:7',
    ]);
  });

  it('is equal for a shape that spells its defaults and one that omits them', () => {
    expect(shapeFacts({ kind: 'heart', colour: 'green', size: 'big', count: 1 })).toEqual(
      shapeFacts({ kind: 'heart', colour: 'green' }),
    );
  });
});
