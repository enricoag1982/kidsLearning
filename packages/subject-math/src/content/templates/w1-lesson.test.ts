// The 13 W1 templates in one test-only lesson (`w1-fixture.ts`, not part of `content/`): it builds through the platform loader with no
// issue, every generated sentence resolves and fits a card, every exercise plays through its own kind, every bug of the curriculum can
// be spoken, and the voice inventory lists exactly what the lesson speaks. The shipped content, which uses no template yet, gains none
// of it.
import { cpSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { compileAll } from '@learn/platform-content/compile-all';
import { loadSubjectContent } from '@learn/platform-content/lesson-load';
import type { LocaleTree } from '@learn/platform-content/schema';
import { resolveText } from '@learn/platform-content/text-resolve';
import type { MathContent, MathExerciseDef } from '../../core/types.ts';
import { playSolution, playWrongThenSolve, starsFor } from '../../testing/play.ts';
import { mathContent, MATH_TEMPLATES } from '../math-content.ts';
import { BUG_IDS } from './bugs.ts';
import {
  W1_FIXTURE_LESSON,
  W1_FIXTURE_LESSON_ID,
  W1_FIXTURE_TEMPLATES,
  W1_FIXTURE_TEXTS,
} from './w1-fixture.ts';
import { AUTHORED_LOCALES } from './testing.ts';

const realRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'content');

/** The kind each template writes. */
const KIND_OF: Readonly<Record<(typeof W1_FIXTURE_TEMPLATES)[number], MathExerciseDef['type']>> = {
  'pv-build': 'place-value',
  'pv-read': 'number-entry',
  'pv-which': 'choice',
  'pv-expanded': 'number-entry',
  'cmp-sign': 'choice',
  'cmp-order': 'order',
  'cmp-tf': 'true-false',
  'nl-place': 'number-line',
  'nl-estimate': 'number-line',
  'nl-half': 'number-entry',
  'round-ten': 'choice',
  'round-hundred': 'number-entry',
  'round-tf': 'true-false',
};

/** The exercises' stems in the order of the lesson file (`fx-build`, `fx-read`, …) and the template of each. */
const STEMS: readonly (readonly [string, (typeof W1_FIXTURE_TEMPLATES)[number]])[] = [
  ['fx-build', 'pv-build'],
  ['fx-read', 'pv-read'],
  ['fx-which', 'pv-which'],
  ['fx-expanded', 'pv-expanded'],
  ['fx-sign', 'cmp-sign'],
  ['fx-order', 'cmp-order'],
  ['fx-tf', 'cmp-tf'],
  ['fx-place', 'nl-place'],
  ['fx-estimate', 'nl-estimate'],
  ['fx-half', 'nl-half'],
  ['fx-ten', 'round-ten'],
  ['fx-hundred', 'round-hundred'],
  ['fx-round-tf', 'round-tf'],
];

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function scratch(): string {
  const root = mkdtempSync(join(tmpdir(), 'math-w1-'));
  roots.push(root);
  return root;
}

/** The fixture lesson through `loadSubjectContent` alone (a throw is an issue list), with its texts merged into the authored locales. */
function load() {
  const root = scratch();
  mkdirSync(join(root, 'lessons', 'fixture'), { recursive: true });
  mkdirSync(join(root, 'minigames'));
  writeFileSync(
    join(root, 'lessons', 'fixture', `${W1_FIXTURE_LESSON_ID}.yaml`),
    W1_FIXTURE_LESSON,
  );
  const en = AUTHORED_LOCALES.en ?? {};
  const locales = {
    en: { ...en, lessons: { ...en.lessons, ...(parse(W1_FIXTURE_TEXTS) as LocaleTree) } },
  };
  return loadSubjectContent<MathContent>(
    join(root, 'lessons'),
    join(root, 'minigames'),
    locales,
    mathContent,
  );
}

/** A copy of the math content with the fixture lesson in the `adding` world, compiled whole (tracks, badges, voice inventory). */
function compileWithFixture() {
  const root = scratch();
  cpSync(realRoot, root, { recursive: true });
  writeFileSync(join(root, 'lessons', 'adding', `${W1_FIXTURE_LESSON_ID}.yaml`), W1_FIXTURE_LESSON);
  const texts = join(root, 'locales', 'en', 'lessons.yaml');
  writeFileSync(texts, `${readFileSync(texts, 'utf8')}${W1_FIXTURE_TEXTS}`);
  return compileAll<MathContent>(mathContent, root);
}

function defsOf(content: MathContent): readonly MathExerciseDef[] {
  const lesson = content.lessons.find((entry) => entry.id === W1_FIXTURE_LESSON_ID);
  return [...(lesson?.guided ?? []), ...(lesson?.exercises ?? [])];
}

/** The text refs of every reason an exercise can speak. */
function reasonKeys(def: MathExerciseDef): readonly string[] {
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
      return (def.reasons ?? []).map((reason) => reason.reasonKey);
  }
}

/** The English sentence of a `lessons:` text ref. */
function english(lessons: LocaleTree, ref: string): string {
  const text = resolveText(lessons, ref.replace(/^lessons:/, ''));
  if (text === undefined) throw new Error(`no text for ${ref}`);
  return text;
}

describe('the registry', () => {
  it('holds exactly the 13 W1 templates of the curriculum, and the fixture lesson uses each of them', () => {
    expect(Object.keys(MATH_TEMPLATES).sort()).toEqual([...W1_FIXTURE_TEMPLATES].sort());
    expect(STEMS.map(([, template]) => template)).toEqual([...W1_FIXTURE_TEMPLATES]);
    expect(Object.keys(mathContent.templates ?? {}).sort()).toEqual(
      [...W1_FIXTURE_TEMPLATES].sort(),
    );
  });

  it('has a template text in lessons.yaml for exactly the templates (and the 4-digit variants of pv-read / pv-which)', () => {
    const texts = AUTHORED_LOCALES.en?.lessons?.templates;
    expect(typeof texts === 'object' ? Object.keys(texts).sort() : texts).toEqual(
      [...W1_FIXTURE_TEMPLATES, 'pv-read-4', 'pv-which-4'].sort(),
    );
  });
});

describe('the W1 fixture lesson', () => {
  it('builds with no issue: every template expands, to the kind it writes, with ids <stem>-<n>', () => {
    const { content } = load();
    const defs = defsOf(content);
    for (const [stem, template] of STEMS) {
      const mine = defs.filter((def) => def.id.startsWith(`${stem}-`));
      expect(mine.length, stem).toBeGreaterThan(0);
      expect(
        mine.map((def) => def.type),
        stem,
      ).toEqual(mine.map(() => KIND_OF[template]));
      expect(
        mine.map((def) => def.id),
        stem,
      ).toEqual(mine.map((_def, i) => `${stem}-${String(i + 1)}`));
    }
    expect(defs).toHaveLength(2 + 1 + 1 + 1 + 3 + 1 + 3 + 2 + 1 + 1 + 1 + 2 + 3);
    expect(new Set(defs.map((def) => def.id)).size).toBe(defs.length);
  });

  it('resolves every generated sentence in the locales: filled in, at most 14 words, the guided builds as asked', () => {
    const { content, locales } = load();
    const lessons = locales.en?.lessons ?? {};
    for (const def of defsOf(content)) {
      expect(def.textKey, def.id).toBe(`lessons:gen.${def.id}.text`);
      const text = english(lessons, def.textKey);
      expect(text, def.id).not.toMatch(/\{\{|undefined/);
      expect(text.split(/\s+/).length, def.id).toBeLessThanOrEqual(14);
    }
    const guided =
      content.lessons.find((lesson) => lesson.id === W1_FIXTURE_LESSON_ID)?.guided ?? [];
    expect(guided.map((def) => english(lessons, def.textKey))).toEqual([
      'Build 243 with blocks.',
      'Build 305 with blocks.',
    ]);
  });

  it('plays: every exercise is solved by its own kind’s solution with 3 stars, and one wrong try costs exactly one error', () => {
    for (const def of defsOf(load().content)) {
      expect(playSolution(def), def.id).toMatchObject({ solved: true, errors: 0 });
      expect(starsFor(playSolution(def)), def.id).toBe(3);
      expect(playWrongThenSolve(def), def.id).toMatchObject({ solved: true, errors: 1 });
    }
  });

  it('can speak every bug of the curriculum (the lessons.yaml sentence resolves for each reason)', () => {
    const { content, locales } = load();
    const keys = new Set(defsOf(content).flatMap(reasonKeys));
    expect([...keys].sort()).toEqual(BUG_IDS.map((id) => `lessons:bugs.${id}`).sort());
    for (const key of keys) expect(english(locales.en?.lessons ?? {}, key), key).not.toBe('');
  });

  it('lists in the voice inventory every generated sentence and every reason the lesson speaks', () => {
    const compiled = compileWithFixture();
    const lessons = compiled.locales.en?.lessons ?? {};
    const listed = new Set(compiled.voiceTexts.entries.map((entry) => entry.text));
    const defs = defsOf(compiled.content);
    for (const def of defs) {
      expect(listed.has(english(lessons, def.textKey)), def.id).toBe(true);
      for (const key of reasonKeys(def)) expect(listed.has(english(lessons, key)), key).toBe(true);
    }
    expect(listed.has('Build 243 with blocks.')).toBe(true);
    expect(listed.has('Which sign goes in the gap? The open side faces the bigger number.')).toBe(
      true,
    );
  });
});

describe('the shipped math content, which uses no template yet', () => {
  it('lists none of the template or bug texts in its voice inventory (they are only narrated once a lesson uses them)', () => {
    const shipped = compileAll<MathContent>(mathContent, realRoot);
    const listed = shipped.voiceTexts.entries.map((entry) => entry.text);
    const bugs = AUTHORED_LOCALES.en?.lessons?.bugs;
    const bugTexts =
      typeof bugs === 'object'
        ? Object.values(bugs).filter((text) => typeof text === 'string')
        : [];
    expect(bugTexts).toHaveLength(BUG_IDS.length);
    for (const text of bugTexts) expect(listed).not.toContain(text);
    expect(listed).not.toContain('Is this true?');
    expect(
      shipped.content.lessons
        .flatMap((lesson) => lesson.exercises)
        .some((def) => def.id.startsWith('gen')),
    ).toBe(false);
  });
});
