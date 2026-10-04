import { join } from 'node:path';
import type { CompiledContent, Resolve } from '@learn/platform-core';
import { takeAwayGame } from '@learn/platform-core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { z } from 'zod';
import { loadContent } from '../lesson-load.ts';
import { loadLocales } from '../load.ts';
import { PLATFORM_LOCALES_DIR } from '../paths.ts';
import { resolveText } from '../text-resolve.ts';
import type { SubjectContent } from '../subject.ts';
import {
  dir,
  fixturesAfterEach,
  fixturesBeforeEach,
  fixtureSubject,
  issuesOf,
  write,
  writeDefaultLocales,
  writeLesson,
} from '../testing/fixture-subject.ts';
import { createDuelContent } from './duel.ts';
import { duelVoiceTemplates } from './duel-voice.ts';

beforeEach(fixturesBeforeEach);
afterEach(fixturesAfterEach);

const duel = createDuelContent({
  'take-away-fixture': {
    params: z.object({ pile: z.number().int().min(1).max(30) }).strict(),
    game: takeAwayGame,
  },
});
const subject: SubjectContent = {
  ...fixtureSubject,
  modes: { ...fixtureSubject.modes, duel },
};

/** A `duel` mini-game file over the take-away game: the bot opens on a pile of 6, which is lost for the mover. */
function writeDuel(overrides: Record<string, unknown> = {}): void {
  write(
    'minigames/mg1.yaml',
    stringify({
      id: 'mg1',
      concept: 'c1',
      unlockAfter: 'demo-lesson',
      mode: 'duel',
      game: 'take-away-fixture',
      params: { pile: 6 },
      level: 1,
      first: 'bot',
      ...overrides,
    }),
  );
}

function issues(overrides: Record<string, unknown> = {}): string[] {
  writeLesson();
  writeDuel(overrides);
  writeDefaultLocales();
  return issuesOf(subject);
}

describe('createDuelContent', () => {
  it('compiles a duel with the parsed params and the shared catalog fields, keeping the compiled key order', () => {
    expect(issues()).toEqual([]);
    const [game] = loadContent(
      join(dir, 'lessons'),
      join(dir, 'minigames'),
      loadLocales(join(dir, 'locales')),
      subject,
    ).minigames;
    expect(game).toEqual({
      mode: 'duel',
      id: 'mg1',
      concept: 'c1',
      game: 'take-away-fixture',
      params: { pile: 6 },
      level: 1,
      first: 'bot',
      titleKey: 'lessons:mg1.title',
      goalKey: 'lessons:mg1.goal',
      unlockAfter: 'demo-lesson',
    });
    expect(Object.keys(game ?? {})).toEqual([
      'mode',
      'id',
      'concept',
      'game',
      'params',
      'level',
      'first',
      'titleKey',
      'goalKey',
      'unlockAfter',
    ]);
  });

  it('accepts the kid opening on a pile that is not a multiple of 3, and every level', () => {
    for (const level of [1, 2, 3]) {
      expect(issues({ first: 'kid', params: { pile: 7 }, level })).toEqual([]);
    }
  });

  it('rejects an unknown game', () => {
    expect(
      issues({ game: 'no-such-game' }).some((issue) =>
        issue.includes('minigames/mg1.yaml: game: unknown game "no-such-game"'),
      ),
    ).toBe(true);
  });

  it("rejects params the game's own schema refuses, at the params path", () => {
    expect(
      issues({ params: { pile: 0 } }).some((issue) =>
        issue.startsWith('minigames/mg1.yaml: params.pile:'),
      ),
    ).toBe(true);
    expect(
      issues({ params: { pile: 6, extra: 1 } }).some((issue) => issue.includes('params')),
    ).toBe(true);
    expect(issues({ params: undefined }).some((issue) => issue.includes('params'))).toBe(true);
  });

  it('rejects a level outside 1-3 and an unknown first side', () => {
    expect(issues({ level: 4 }).some((issue) => issue.includes('level'))).toBe(true);
    expect(issues({ level: 0 }).some((issue) => issue.includes('level'))).toBe(true);
    expect(issues({ first: 'nobody' }).some((issue) => issue.includes('first'))).toBe(true);
  });

  it('rejects a bot that wins from the start (first: bot on a pile the mover wins)', () => {
    expect(
      issues({ params: { pile: 7 } }).some(
        (issue) =>
          issue.startsWith('minigames/mg1.yaml:') &&
          issue.includes('the bot wins from the start with perfect play'),
      ),
    ).toBe(true);
  });

  it('rejects a lost start for the kid moving first (first: kid on a multiple of 3)', () => {
    expect(
      issues({ first: 'kid', params: { pile: 6 } }).some((issue) =>
        issue.includes('the kid cannot force a win moving first'),
      ),
    ).toBe(true);
  });

  it('rejects an opening that leaves the kid no winning move, even when the bot has no best move', () => {
    // A game that claims every position is lost for the mover: the bot "opens" with any move and the kid has no best reply.
    const lying = createDuelContent({
      'take-away-fixture': {
        params: z.object({ pile: z.number() }),
        game: { ...takeAwayGame, bestMoves: () => [] },
      },
    });
    writeLesson();
    writeDuel({ params: { pile: 7 } });
    writeDefaultLocales();
    expect(
      issuesOf({ ...subject, modes: { ...subject.modes, duel: lying } }).some((issue) =>
        issue.includes('an opening of the bot ends the game or leaves the kid no winning move'),
      ),
    ).toBe(true);
  });

  it('reports a game that throws on its start position instead of crashing the build', () => {
    const throwing = createDuelContent({
      'take-away-fixture': {
        params: z.object({ pile: z.number() }),
        game: {
          ...takeAwayGame,
          start: () => {
            throw new Error('bad start');
          },
        },
      },
    });
    writeLesson();
    writeDuel();
    writeDefaultLocales();
    expect(
      issuesOf({ ...subject, modes: { ...subject.modes, duel: throwing } }).some((issue) =>
        issue.includes('failed on its start position: bad start'),
      ),
    ).toBe(true);
  });

  it('compiles an own hint key and checks that it resolves', () => {
    writeLesson();
    writeDuel({ hint: 'mg1-hint' });
    writeDefaultLocales();
    expect(
      issuesOf(subject).some((issue) =>
        issue.includes('minigames/mg1.yaml: hint: missing text key "lessons:mg1-hint"'),
      ),
    ).toBe(true);

    write(
      'locales/en/lessons.yaml',
      stringify({
        'demo-lesson': { title: 'Title', story: 'Story' },
        'demo-demo': 'Demo',
        'demo-01': 'Exercise',
        'opt-a': 'Option A',
        'opt-b': 'Option B',
        mg1: { title: 'Title', goal: 'Goal' },
        'mg1-hint': 'Leave a pile of 3.',
      }),
    );
    expect(issuesOf(subject)).toEqual([]);
  });

  it('has no exercises of its own', () => {
    expect('exercises' in duel).toBe(false);
  });
});

describe('duelVoiceTemplates', () => {
  const platform = loadLocales(PLATFORM_LOCALES_DIR);
  const r: Resolve = (key, vars = {}) => {
    const separator = key.indexOf(':');
    const namespace = separator < 0 ? 'common' : key.slice(0, separator);
    const path = separator < 0 ? key : key.slice(separator + 1);
    const tree =
      namespace === 'characters'
        ? { fox: { name: 'Fox' } }
        : (platform.en?.[namespace] ?? { 'own-hint': 'Leave me a pile of 3.' });
    const text = resolveText(tree, path, vars);
    if (text === undefined) throw new Error(`no text for ${key}`);
    return text;
  };

  function spokenFor(
    content: Partial<CompiledContent>,
    characters = { fox: { topicKey: 't' } },
  ): string[] {
    const spoken: string[] = [];
    duelVoiceTemplates(characters)((text) => spoken.push(text), r, {
      version: 1,
      lessons: [],
      minigames: [],
      ...content,
    });
    return spoken;
  }

  const duelGame = (overrides: Record<string, unknown>): CompiledContent['minigames'][number] =>
    ({
      mode: 'duel',
      id: 'd1',
      concept: 'c',
      titleKey: 'lessons:d1.title',
      goalKey: 'lessons:d1.goal',
      unlockAfter: 'l1',
      game: 'g',
      params: {},
      level: 1,
      first: 'bot',
      ...overrides,
    }) as CompiledContent['minigames'][number];

  const lesson = (character: string): CompiledContent['lessons'][number] =>
    ({ id: 'l1', character }) as CompiledContent['lessons'][number];

  it('adds nothing for a content without a duel', () => {
    expect(spokenFor({})).toEqual([]);
  });

  it("speaks the platform's lines, the default hint and the character's name as the bot", () => {
    const spoken = spokenFor({ lessons: [lesson('fox')], minigames: [duelGame({})] });
    expect(spoken).toEqual([
      'Your turn',
      'You won! Great thinking!',
      'I won this time. Try again!',
      'A draw! Try again.',
      'Look for a move that leaves me stuck.',
      "Fox's turn",
    ]);
  });

  it("names the bot Owl for a lesson whose character the subject does not list, and uses the game's own hint", () => {
    const spoken = spokenFor({
      lessons: [lesson('owl')],
      minigames: [duelGame({ hintKey: 'lessons:own-hint' })],
    });
    expect(spoken).toContain("Owl's turn");
    expect(spoken).toContain('Leave me a pile of 3.');
    expect(spoken).not.toContain('Look for a move that leaves me stuck.');
  });
});
