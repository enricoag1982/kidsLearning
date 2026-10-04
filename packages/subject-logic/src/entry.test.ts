import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { logicCore } from './core/logic-core.ts';
import { logicEntry } from './entry.ts';

/** The module specifiers `file` (relative to `src/`) imports or re-exports statically; a `import()` call is not one. */
function staticSpecifiers(file: string): string[] {
  const source = readFileSync(new URL(file, import.meta.url), 'utf-8');
  return [...source.matchAll(/^(?:import|export)\s[^;]*?\sfrom\s+'([^']+)'/gm)].map(
    (match) => match[1] ?? '',
  );
}

describe('logicEntry', () => {
  it('is the subject manifest: id, the core settings slot (same object), English name, icon, tile colours', () => {
    expect(logicEntry.manifest.id).toBe('logic');
    expect(logicEntry.manifest.id).toBe(logicCore.id);
    expect(logicEntry.manifest.settings).toBe(logicCore.settings);
    expect(logicEntry.manifest.names.en).toBe('Logic');
    expect(logicEntry.manifest.icon).not.toBe('');
    // The Home palette's purple: chess uses the green, math the orange, coding the blue.
    expect(logicEntry.manifest.colors).toEqual({ bg: '#EFE4F7', fg: '#4B3A63', ledge: '#352945' });
  });

  it('imports only light modules statically (no pack, kinds or core)', () => {
    expect(staticSpecifiers('./entry.ts').sort()).toEqual([
      './web/art/subject-icon.svg',
      '@learn/platform-core/domain/exercise/kinds/cards/settings-slot',
      '@learn/platform-web/app/subject.ts',
    ]);
  });
});
