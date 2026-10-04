import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createCardCore } from './core.ts';
import { CARD_SETTINGS_SLOT } from './settings-slot.ts';

describe('CARD_SETTINGS_SLOT', () => {
  it('is the settings slot of every card core (one object, so a light entry can share it)', () => {
    expect(createCardCore({ id: 'cards', characters: {} }).settings).toBe(CARD_SETTINGS_SLOT);
  });

  it('has no fields of its own', async () => {
    expect(CARD_SETTINGS_SLOT.defaults).toEqual({});
    expect(CARD_SETTINGS_SLOT.isValid({})).toBe(true);
    await expect(CARD_SETTINGS_SLOT.loadBackupShape()).resolves.toEqual({});
  });

  it('stays a light module: its only import is a type (no kinds, no core)', () => {
    const source = readFileSync(new URL('./settings-slot.ts', import.meta.url), 'utf-8');
    const imports = [...source.matchAll(/^import\s(type\s)?[^;]*?\sfrom\s+'([^']+)'/gm)];
    expect(imports.map((match) => [match[1]?.trim(), match[2]])).toEqual([
      ['type', '../../../subject.ts'],
    ]);
  });
});
