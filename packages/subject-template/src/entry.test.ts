import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { templateCore } from './core.ts';
import { templateEntry } from './entry.ts';

/** The module specifiers `file` (relative to `src/`) imports or re-exports statically; a `import()` call is not one. */
function staticSpecifiers(file: string): string[] {
  const source = readFileSync(new URL(file, import.meta.url), 'utf-8');
  return [...source.matchAll(/^(?:import|export)\s[^;]*?\sfrom\s+'([^']+)'/gm)].map(
    (match) => match[1] ?? '',
  );
}

describe('templateEntry', () => {
  it('is the subject manifest: id, the core settings slot (same object), English name, icon, tile colours', () => {
    expect(templateEntry.manifest.id).toBe('template');
    expect(templateEntry.manifest.id).toBe(templateCore.id);
    expect(templateEntry.manifest.settings).toBe(templateCore.settings);
    expect(templateEntry.manifest.names.en).toBe('Template');
    expect(templateEntry.manifest.icon).not.toBe('');
    expect(Object.keys(templateEntry.manifest.colors).sort()).toEqual(['bg', 'fg', 'ledge']);
  });

  it('imports only light modules statically (no pack, kinds or core)', () => {
    expect(staticSpecifiers('./entry.ts').sort()).toEqual([
      './web/art/subject-icon.svg',
      '@learn/platform-core/domain/exercise/kinds/cards/settings-slot',
      '@learn/platform-web/app/subject.ts',
    ]);
  });
});
