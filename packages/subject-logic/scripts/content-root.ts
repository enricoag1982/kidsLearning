import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** The content directory of the package at `packageDir`. The platform's content loader reads `minigames/` unconditionally and git
 * keeps no empty directory, so while logic has no boss (the fixture world has none; m14.9 adds the first) the directory is created
 * here, by the build and by the content tests alike. */
export function contentRoot(packageDir: string): string {
  const root = join(packageDir, 'content');
  mkdirSync(join(root, 'minigames'), { recursive: true });
  return root;
}
