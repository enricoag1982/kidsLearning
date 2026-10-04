import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chessCore } from './core/chess-core.ts';
import { CHESS_APP_CONFIG, chessEntry } from './entry.ts';

/** The module specifiers `file` (relative to `src/`) imports or re-exports statically; a `import()` call is not one. */
function staticSpecifiers(file: string): string[] {
  const source = readFileSync(new URL(file, import.meta.url), 'utf-8');
  return [...source.matchAll(/^(?:import|export)\s[^;]*?\sfrom\s+'([^']+)'/gm)].map(
    (match) => match[1] ?? '',
  );
}

describe('chessEntry', () => {
  it('is the chess manifest: id, the core settings slot (same object), English name, icon, tile colours', () => {
    expect(chessEntry.manifest.id).toBe('chess');
    expect(chessEntry.manifest.id).toBe(chessCore.id);
    expect(chessEntry.manifest.settings).toBe(chessCore.settings);
    expect(chessEntry.manifest.names.en).toBe('Chess');
    expect(chessEntry.manifest.icon).not.toBe('');
    expect(Object.keys(chessEntry.manifest.colors).sort()).toEqual(['bg', 'fg', 'ledge']);
  });

  it('shares its app config with the core re-export', () => {
    expect(CHESS_APP_CONFIG.storagePrefix).toBe('chess-kids:');
  });

  // The shell imports `entry.ts` eagerly; anything it pulls in statically lands in the entry chunk, so the pack, the kinds
  // and chess.js must stay behind `load()`.
  it('imports only light modules statically (no pack, kinds, core or chess.js)', () => {
    expect(staticSpecifiers('./entry.ts').sort()).toEqual([
      './core/chess/app-config.ts',
      './core/chess/settings-slot.ts',
      './web/art/subject-icon.svg',
      '@learn/platform-web/app/subject.ts',
    ]);
    expect(staticSpecifiers('./core/chess/settings-slot.ts').sort()).toEqual([
      './settings.ts',
      '@learn/platform-core/domain/subject',
    ]);
    expect(staticSpecifiers('./core/chess/settings.ts')).toEqual([]);
    expect(staticSpecifiers('./core/chess/app-config.ts')).toEqual([
      '@learn/platform-core/domain/subject',
    ]);
  });
});
