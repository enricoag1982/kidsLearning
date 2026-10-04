// The loading and reading helpers the fixture-lesson tests share (never imported by shipped code): a fixture lesson through
// `loadSubjectContent` alone, or compiled whole inside a copy of the shipped content, its exercises, the text refs of their reasons
// and the English of a `lessons:` ref.
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach } from 'vitest';
import { parse } from 'yaml';
import { compileAll } from '@learn/platform-content/compile-all';
import { loadSubjectContent } from '@learn/platform-content/lesson-load';
import type { LocaleTree } from '@learn/platform-content/schema';
import { resolveText } from '@learn/platform-content/text-resolve';
import type { MathContent, MathExerciseDef } from '../../core/types.ts';
import { mathContent } from '../math-content.ts';
import { AUTHORED_LOCALES } from './testing.ts';

export const REAL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'content');

export interface Fixture {
  readonly id: string;
  /** `lessons/<world>/<id>.yaml`. */
  readonly lesson: string;
  /** Appended to `lessons.yaml` (the lesson's title, story and demo). */
  readonly texts: string;
}

/** Call once in a test file: removes the scratch directories after each test; returns the loaders of `fixture`. */
export function useFixture(fixture: Fixture) {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });
  const scratch = (): string => {
    const root = mkdtempSync(join(tmpdir(), 'math-fixture-'));
    roots.push(root);
    return root;
  };
  return {
    /** The fixture lesson through `loadSubjectContent` alone (a throw is an issue list), its texts merged into the authored locales. */
    load: () => {
      const root = scratch();
      mkdirSync(join(root, 'lessons', 'fixture'), { recursive: true });
      mkdirSync(join(root, 'minigames'));
      writeFileSync(join(root, 'lessons', 'fixture', `${fixture.id}.yaml`), fixture.lesson);
      const en = AUTHORED_LOCALES.en ?? {};
      const locales = {
        en: { ...en, lessons: { ...en.lessons, ...(parse(fixture.texts) as LocaleTree) } },
      };
      return loadSubjectContent<MathContent>(
        join(root, 'lessons'),
        join(root, 'minigames'),
        locales,
        mathContent,
      );
    },
    /** A copy of the math content with the fixture lesson in its first world, compiled whole (tracks, badges, voice inventory). */
    compileWithFixture: () => {
      const root = scratch();
      cpSync(REAL_ROOT, root, { recursive: true });
      const world = readdirSync(join(root, 'lessons')).sort()[0] ?? 'fixture';
      writeFileSync(join(root, 'lessons', world, `${fixture.id}.yaml`), fixture.lesson);
      const texts = join(root, 'locales', 'en', 'lessons.yaml');
      writeFileSync(texts, `${readFileSync(texts, 'utf8')}${fixture.texts}`);
      return compileAll<MathContent>(mathContent, root);
    },
    /** The fixture lesson's guided and scored exercises. */
    defsOf: (content: MathContent): readonly MathExerciseDef[] => {
      const lesson = content.lessons.find((entry) => entry.id === fixture.id);
      return [...(lesson?.guided ?? []), ...(lesson?.exercises ?? [])];
    },
  };
}

/** The text refs of every reason an exercise can speak. */
export function reasonKeys(def: MathExerciseDef): readonly string[] {
  switch (def.type) {
    case 'choice':
      return def.options.flatMap((option) =>
        option.reasonKey === undefined ? [] : [option.reasonKey],
      );
    case 'true-false':
      return def.reasonKey === undefined ? [] : [def.reasonKey];
    case 'order':
      return [];
    case 'number-entry':
    case 'number-line':
    case 'place-value':
    case 'array':
      return (def.reasons ?? []).map((reason) => reason.reasonKey);
  }
}

/** The English sentence of a `lessons:` text ref. */
export function english(lessons: LocaleTree, ref: string): string {
  const text = resolveText(lessons, ref.replace(/^lessons:/, ''));
  if (text === undefined) throw new Error(`no text for ${ref}`);
  return text;
}
