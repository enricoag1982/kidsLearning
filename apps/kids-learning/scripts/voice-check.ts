/**
 * `pnpm voice:check` (`docs/voice.md`, `docs/multi-subject.md` D13): rebuilds every subject's voice inventory in memory — same
 * content, same `buildVoiceInventory` as each subject's `scripts/build-content.ts`, without writing any `dist/voice-texts.json` —
 * and compares the union of their keys against `public/audio/en/manifest.json`'s own `entries` (one audio folder for the whole
 * app; a text two subjects share, the platform's own, has one key and one file). CI's own guard against a content/UI change that
 * added narrated text but forgot to regenerate its audio.
 *
 * Fails (exit 1) on any inventory key with no manifest entry: exactly the case `tools/voice/generate.py` exists to fix. Warns
 * (exit 0, does not fail) on an orphan manifest entry (a key in no subject's inventory) — `generate.py`'s own next run prunes
 * those files itself.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exitOnContentError } from '@learn/platform-content/build';
import { compileAll } from '@learn/platform-content/compile-all';
import type { SubjectContent } from '@learn/platform-content/subject';
import { appSubjectIds, camelCase } from './app-subjects.ts';

const appDir = fileURLToPath(new URL('..', import.meta.url));
const packagesDir = join(appDir, '..', '..', 'packages');
const manifestPath = join(appDir, 'public', 'audio', 'en', 'manifest.json');

/** The subjects the app depends on (`app-subjects.ts`), each with its `@learn/subject-<id>/content` export `<camelId>Content`
 * and the source root of its content. */
const SUBJECTS: readonly {
  readonly id: string;
  readonly content: SubjectContent;
  readonly root: string;
}[] = await Promise.all(
  appSubjectIds().map(async (id) => {
    const module = (await import(`@learn/subject-${id}/content`)) as Readonly<
      Record<string, SubjectContent | undefined>
    >;
    const content = module[`${camelCase(id)}Content`];
    if (content === undefined) {
      throw new Error(`@learn/subject-${id}/content has no export ${camelCase(id)}Content`);
    }
    return { id, content, root: join(packagesDir, `subject-${id}`, 'content') };
  }),
);

interface InventoryText {
  readonly subject: string;
  readonly key: string;
  readonly text: string;
}

/** Every subject's inventory, one entry per (subject, key). */
const inventory: InventoryText[] = [];
for (const { id, content, root } of SUBJECTS) {
  try {
    const { entries } = compileAll(content, root).voiceTexts;
    console.log(`voice:check: ${id}: ${String(entries.length)} inventory text(s).`);
    for (const { key, text } of entries) inventory.push({ subject: id, key, text });
  } catch (error) {
    exitOnContentError(error);
  }
}

interface VoiceManifest {
  readonly entries?: Readonly<Record<string, { readonly text?: string }>>;
}

let manifest: VoiceManifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as VoiceManifest;
} catch (error) {
  console.error(`voice:check: could not read ${manifestPath} (${String(error)}).`);
  console.error('voice:check: run `pnpm voice:generate`.');
  process.exit(1);
}

const manifestKeys = new Set(Object.keys(manifest.entries ?? {}));
const inventoryKeys = new Set(inventory.map((entry) => entry.key));
const missing = inventory.filter((entry) => !manifestKeys.has(entry.key));
const orphans = [...manifestKeys].filter((key) => !inventoryKeys.has(key));

if (orphans.length > 0) {
  console.warn(
    `voice:check: ${String(orphans.length)} orphan audio file(s) in the manifest (in no subject's ` +
      'inventory — `tools/voice/generate.py` prunes these on its next run):',
  );
  for (const key of orphans) {
    console.warn(`  ${key}: ${manifest.entries?.[key]?.text ?? '(no text recorded)'}`);
  }
}

if (missing.length > 0) {
  console.error(
    `voice:check: ${String(missing.length)} inventory text(s) have no generated audio — run ` +
      '`pnpm voice:generate`:',
  );
  for (const entry of missing) {
    console.error(`  [${entry.subject}] ${entry.key}: ${entry.text}`);
  }
  process.exit(1);
}

console.log(
  `voice:check: ${String(inventoryKeys.size)} distinct inventory text(s) over ${String(SUBJECTS.length)} subjects, ` +
    'every one has generated audio.',
);
