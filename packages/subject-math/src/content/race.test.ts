// Race to 20's content: the mini-game YAML, the build's duel verify with a failing fixture per rule, the schema of its `params`, the
// texts, and the voice inventory of every line the board and the duel step speak (counted exactly: a bounded set).
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import type { DuelGameDef } from '@learn/platform-core';
import { race } from '../core/games/race.ts';
import type { RaceParams } from '../core/games/race.ts';
import type { MathContent } from '../core/types.ts';
import { mathContent } from './math-content.ts';
import { raceParamsSchema } from './race.ts';

const realRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A copy of math's content with `race-to-20.yaml` rewritten by `edit` (and `extraTexts` appended to `lessons.yaml`). */
function rootWith(edit: (yaml: string) => string, extraTexts = ''): string {
  const root = mkdtempSync(join(tmpdir(), 'math-race-'));
  roots.push(root);
  cpSync(realRoot, root, { recursive: true });
  const file = join(root, 'minigames', 'race-to-20.yaml');
  writeFileSync(file, edit(readFileSync(file, 'utf8')));
  if (extraTexts !== '') {
    const texts = join(root, 'locales', 'en', 'lessons.yaml');
    writeFileSync(texts, `${readFileSync(texts, 'utf8')}${extraTexts}`);
  }
  return root;
}

const shipped = compileAll<MathContent>(mathContent, realRoot);
const duel = shipped.content.minigames.find(
  (game): game is DuelGameDef => game.id === 'race-to-20',
);

describe('race-to-20.yaml', () => {
  it('compiles to a bot-first level-1 duel of the race game, unlocked after pv-round (World 1’s last lesson), on its concept', () => {
    expect(duel).toEqual({
      mode: 'duel',
      id: 'race-to-20',
      concept: 'pv-round',
      game: 'race',
      params: { target: 20, maxStep: 3 },
      level: 1,
      first: 'bot',
      hintKey: 'lessons:race.hint',
      titleKey: 'lessons:race-to-20.title',
      goalKey: 'lessons:race-to-20.goal',
      unlockAfter: 'pv-round',
    });
  });

  it('the bot moves first from 0, where the mover loses, and the kid can force the win', () => {
    if (duel === undefined) throw new Error('no race-to-20');
    const start = race.start(duel.params as RaceParams, duel.first);
    expect(race.toMove(start)).toBe('bot');
    expect(race.bestMoves(start)).toEqual([]);
    for (const opening of race.moves(start)) {
      expect(race.bestMoves(race.play(start, opening)).length).toBeGreaterThan(0);
    }
  });

  it('is an unlock of World 1’s last lesson, not a world boss (the track ends with Number Train; m13.14 makes Race to 20 the World 3 boss)', () => {
    expect(shipped.tracks.tracks[0]?.worlds.map((world) => world.boss)).toEqual(['number-train']);
    expect(
      shipped.content.lessons.find((lesson) => lesson.id === 'pv-round')?.boss,
    ).toBeUndefined();
  });

  it('has the Hedgehog (the character of pv-round) as its bot', () => {
    const lesson = shipped.content.lessons.find((entry) => entry.id === duel?.unlockAfter);
    expect(lesson?.character).toBe('hedgehog');
    expect(shipped.locales.en?.characters).toMatchObject({ hedgehog: { name: 'Hedgie' } });
  });
});

describe('the duel verify', () => {
  const expectIssue = (edit: (yaml: string) => string, message: RegExp, texts = ''): void => {
    expect(() => compileAll<MathContent>(mathContent, rootWith(edit, texts))).toThrow(message);
  };

  it('rejects a start the kid cannot force a win from: the kid first from 0', () => {
    expectIssue(
      (yaml) => yaml.replace('first: bot', 'first: kid'),
      /race-to-20.*cannot force a win moving first/s,
    );
  });

  it('accepts the kid first where the start is won (a total the bot has not left on 0)', () => {
    // Race to 21 by 1..3: 21 mod 4 = 1, so the mover wins from 0.
    const root = rootWith((yaml) =>
      yaml.replace('first: bot', 'first: kid').replace('target: 20', 'target: 21'),
    );
    expect(compileAll<MathContent>(mathContent, root).content.minigames.map((g) => g.id)).toContain(
      'race-to-20',
    );
  });

  it('rejects params outside the schema, an unknown game and a hint text that does not exist', () => {
    expectIssue((yaml) => yaml.replace('target: 20', 'target: 9'), /params.*target/s);
    expectIssue((yaml) => yaml.replace('target: 20', 'target: 31'), /params.*target/s);
    expectIssue((yaml) => yaml.replace('maxStep: 3', 'maxStep: 5'), /params.*maxStep/s);
    expectIssue((yaml) => yaml.replace('maxStep: 3', 'maxStep: 1'), /params.*maxStep/s);
    expectIssue((yaml) => yaml.replace('maxStep: 3', 'maxStep: 2.5'), /params.*maxStep/s);
    expectIssue((yaml) => yaml.replace('game: race', 'game: chase'), /unknown game "chase"/);
    expectIssue((yaml) => yaml.replace('race.hint', 'race.no-such-hint'), /race\.no-such-hint/);
  });

  it('rejects a level outside 1-3 and a field the schema does not know', () => {
    expectIssue((yaml) => yaml.replace('level: 1', 'level: 4'), /level/);
    expectIssue((yaml) => `${yaml}speed: fast\n`, /speed/);
  });

  it('the params schema takes exactly target 10-30 and maxStep 2-4, whole numbers', () => {
    for (const target of [10, 20, 30]) {
      for (const maxStep of [2, 3, 4]) {
        expect(raceParamsSchema.safeParse({ target, maxStep }).success).toBe(true);
      }
    }
    for (const bad of [
      { target: 9, maxStep: 3 },
      { target: 31, maxStep: 3 },
      { target: 20, maxStep: 1 },
      { target: 20, maxStep: 5 },
      { target: 20.5, maxStep: 3 },
      { target: 20 },
      { target: 20, maxStep: 3, extra: 1 },
    ]) {
      expect(raceParamsSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('the texts and the voice inventory', () => {
  const texts = shipped.voiceTexts.entries;
  const bySource = (source: string): string[] =>
    texts.filter((entry) => entry.source === source).map((entry) => entry.text);

  it('has the title, the goal and the hint of the spec', () => {
    const lessons = shipped.locales.en?.lessons as Record<string, Record<string, string>>;
    expect(lessons['race-to-20']).toEqual({
      title: 'Race to 20',
      goal: 'Take turns adding 1, 2 or 3. Whoever says 20 wins!',
    });
    expect(lessons.race?.hint).toBe('Try to land on 4, 8, 12 or 16.');
    expect(texts.map((entry) => entry.text)).toEqual(
      expect.arrayContaining(['Try to land on 4, 8, 12 or 16.']),
    );
  });

  it('lists the bot’s and the kid’s line for every (step, total) a move can end on before 20: 54 each, Hedgie as the bot', () => {
    const bot = bySource('race-bot-adds');
    const kid = bySource('race-you-add');
    expect(bot).toHaveLength(54);
    expect(kid).toHaveLength(54);
    expect(new Set(bot).size).toBe(54);
    expect(bot).toContain("Hedgie adds 1. Now it's 1.");
    expect(bot).toContain("Hedgie adds 3. Now it's 19.");
    expect(bot).not.toContain("Hedgie adds 3. Now it's 2.");
    expect(bot).not.toContain("Hedgie adds 1. Now it's 20.");
    expect(bot).not.toContain("Hedgie adds 2. Now it's 0.");
    expect(kid).toContain("You add 2. Now it's 7.");
    expect(kid).not.toContain("You add 1. Now it's 20.");
    expect(bySource('race-your-turn')).toEqual(['Your turn!']);
  });

  it('keeps the platform duel lines (turn, result, hint, "Hedgie’s turn") in the same inventory', () => {
    const duelLines = bySource('duel');
    for (const line of [
      'Your turn',
      'You won! Great thinking!',
      'I won this time. Try again!',
      'A draw! Try again.',
      "Hedgie's turn",
    ]) {
      expect(duelLines, line).toContain(line);
    }
    // The game has its own hint, so the platform's generic one is not spoken.
    expect(texts.map((entry) => entry.text)).not.toContain('Look for a move that leaves me stuck.');
    expect(bySource('duel-hint')).toEqual(['Try to land on 4, 8, 12 or 16.']);
  });

  it('every line holds no placeholder', () => {
    for (const entry of texts) {
      expect(entry.text, entry.text).not.toMatch(/\{\{|\}\}/);
    }
  });

  it('a build with no race adds none of these lines', () => {
    const root = mkdtempSync(join(tmpdir(), 'math-race-none-'));
    roots.push(root);
    cpSync(realRoot, root, { recursive: true });
    rmSync(join(root, 'minigames', 'race-to-20.yaml'));
    const without = compileAll<MathContent>(mathContent, root).voiceTexts.entries;
    expect(without.filter((entry) => entry.source.startsWith('race'))).toEqual([]);
    expect(without.filter((entry) => entry.source.startsWith('duel'))).toEqual([]);
  });
});
