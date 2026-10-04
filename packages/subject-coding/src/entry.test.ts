import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { codingCore } from './core/coding-core.ts';
import { codingEntry } from './entry.ts';

/** The module specifiers `file` (relative to `src/`) imports or re-exports statically; a `import()` call is not one. */
function staticSpecifiers(file: string): string[] {
  const source = readFileSync(new URL(file, import.meta.url), 'utf-8');
  return [...source.matchAll(/^(?:import|export)\s[^;]*?\sfrom\s+'([^']+)'/gm)].map(
    (match) => match[1] ?? '',
  );
}

describe('codingEntry', () => {
  it('is the subject manifest: id, the core settings slot (same object), English name, icon, tile colours', () => {
    expect(codingEntry.manifest.id).toBe('coding');
    expect(codingEntry.manifest.id).toBe(codingCore.id);
    expect(codingEntry.manifest.settings).toBe(codingCore.settings);
    expect(codingEntry.manifest.names.en).toBe('Coding');
    expect(codingEntry.manifest.icon).not.toBe('');
    expect(Object.keys(codingEntry.manifest.colors).sort()).toEqual(['bg', 'fg', 'ledge']);
  });

  it('imports only light modules statically (no pack, kinds or core)', () => {
    expect(staticSpecifiers('./entry.ts').sort()).toEqual([
      './web/art/subject-icon.svg',
      '@learn/platform-core/domain/exercise/kinds/cards/settings-slot',
      '@learn/platform-web/app/subject.ts',
    ]);
  });
});
