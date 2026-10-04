import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mathCore } from './core/math-core.ts';
import { MATH_APP_CONFIG, mathEntry } from './entry.ts';

/** The module specifiers `file` (relative to `src/`) imports or re-exports statically; a `import()` call is not one. */
function staticSpecifiers(file: string): string[] {
  const source = readFileSync(new URL(file, import.meta.url), 'utf-8');
  return [...source.matchAll(/^(?:import|export)\s[^;]*?\sfrom\s+'([^']+)'/gm)].map(
    (match) => match[1] ?? '',
  );
}

describe('mathEntry', () => {
  it('is the math manifest: id, the core settings slot (same object), English name, icon, tile colours', () => {
    expect(mathEntry.manifest.id).toBe('math');
    expect(mathEntry.manifest.id).toBe(mathCore.id);
    expect(mathEntry.manifest.settings).toBe(mathCore.settings);
    expect(mathEntry.manifest.names.en).toBe('Math');
    expect(mathEntry.manifest.icon).not.toBe('');
    expect(Object.keys(mathEntry.manifest.colors).sort()).toEqual(['bg', 'fg', 'ledge']);
    expect(MATH_APP_CONFIG.storagePrefix).toBe('math-demo:');
  });

  it('imports only light modules statically (no pack, kinds or core)', () => {
    expect(staticSpecifiers('./entry.ts').sort()).toEqual([
      './core/app-config.ts',
      './core/settings-slot.ts',
      './web/art/hedgehog.webp',
      '@learn/platform-web/app/subject.ts',
    ]);
    expect(staticSpecifiers('./core/settings-slot.ts')).toEqual([
      '@learn/platform-core/domain/subject',
    ]);
    expect(staticSpecifiers('./core/app-config.ts')).toEqual([
      '@learn/platform-core/domain/subject',
    ]);
  });
});
