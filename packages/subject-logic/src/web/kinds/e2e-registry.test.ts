import { describe, expect, it } from 'vitest';
import { CARD_KIND_E2E } from '@learn/platform-web/kinds/cards/e2e-registry.ts';
import { LOGIC_KINDS } from '../../kinds/index.ts';
import { LOGIC_KIND_E2E, logicKindE2EOf } from './e2e-registry.ts';

describe('logic e2e driver registry', () => {
  it('has a driver for every exercise kind: the card kit’s four and grid-fill', () => {
    expect(Object.keys(LOGIC_KIND_E2E).sort()).toEqual(Object.keys(LOGIC_KINDS).sort());
    expect(typeof LOGIC_KIND_E2E['grid-fill'].perform).toBe('function');
    for (const [type, driver] of Object.entries(CARD_KIND_E2E)) {
      expect(LOGIC_KIND_E2E[type as keyof typeof LOGIC_KIND_E2E], type).toBe(driver);
    }
  });

  it('looks a driver up by type, grid-fill included (it no longer throws)', () => {
    expect(logicKindE2EOf('grid-fill')).toBe(LOGIC_KIND_E2E['grid-fill']);
    expect(logicKindE2EOf('choice')).toBe(CARD_KIND_E2E.choice);
  });
});
