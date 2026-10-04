import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARD_SETTINGS_SLOT } from '@learn/platform-core/domain/exercise/kinds/cards/settings-slot';
import { mathCore } from './core/math-core.ts';
import { mathEntry } from './entry.ts';

/** The module specifiers `file` (relative to `src/`) imports or re-exports statically; a `import()` call is not one. */
function staticSpecifiers(file: string): string[] {
  const source = readFileSync(new URL(file, import.meta.url), 'utf-8');
  return [...source.matchAll(/^(?:import|export)\s[^;]*?\sfrom\s+'([^']+)'/gm)].map(
    (match) => match[1] ?? '',
  );
}

describe('mathEntry', () => {
  it('is the math manifest: id, the card kit settings slot (the core one, same object), English name, icon, tile colours', () => {
    expect(mathEntry.manifest.id).toBe('math');
    expect(mathEntry.manifest.id).toBe(mathCore.id);
    expect(mathEntry.manifest.settings).toBe(CARD_SETTINGS_SLOT);
    expect(mathEntry.manifest.settings).toBe(mathCore.settings);
    expect(mathEntry.manifest.names.en).toBe('Math');
    expect(mathEntry.manifest.icon).not.toBe('');
    expect(Object.keys(mathEntry.manifest.colors).sort()).toEqual(['bg', 'fg', 'ledge']);
  });

  it('imports only light modules statically (no pack, kinds or core)', () => {
    expect(staticSpecifiers('./entry.ts').sort()).toEqual([
      './web/art/hedgehog.webp',
      '@learn/platform-core/domain/exercise/kinds/cards/settings-slot',
      '@learn/platform-web/app/subject.ts',
    ]);
  });
});
