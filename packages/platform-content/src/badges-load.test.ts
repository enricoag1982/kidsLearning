import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { MiniGame, TracksCatalog } from '@learn/platform-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadBadges } from './badges-load.ts';
import { ContentError, type Locales } from './load.ts';
import type { BadgesContent } from './subject.ts';

/** No subject fields/condition types: enough to exercise the platform's own validation. */
const NO_SUBJECT_BADGES: BadgesContent = { fields: {}, validate: () => undefined };

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'chess-kids-badges-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(content: string): string {
  const filePath = join(dir, 'badges.yaml');
  writeFileSync(filePath, content, 'utf8');
  return filePath;
}

const CATALOG: TracksCatalog = {
  tracks: [
    {
      id: 'basics',
      kind: 'main',
      titleKey: 'journey:tracks.basics',
      worlds: [
        {
          id: 'board',
          track: 'basics',
          order: 1,
          habitat: 'meadow',
          titleKey: 'journey:worlds.board',
        },
      ],
    },
  ],
  ranks: [{ id: 'pawn', after: 'start' }],
};

const LESSON = {
  id: 'rook',
  world: 'board',
  order: 1,
  concept: 'rook-move',
  character: 'rhino',
  titleKey: 'lessons:rook.title',
  storyKey: 'lessons:rook.story',
  demo: { textKey: 'lessons:rook.demo' },
  guided: [],
  exercises: [],
};

const BUG_SQUASH: MiniGame = {
  id: 'bug-squash',
  mode: 'series',
  concept: 'rook-move',
  titleKey: 'minigames:bug-squash.title',
  goalKey: 'minigames:bug-squash.goal',
  unlockAfter: 'rook',
};

/** en locale with every `rewards:badges.<id>.name`/`.condition` this suite's fixtures reference. */
const LOCALES: Locales = {
  en: {
    rewards: {
      badges: {
        'has-name': { name: 'Has Name', condition: 'Do a thing' },
        'plural-one': {
          name: 'Plural',
          condition_one: 'Do {{count}} thing',
          condition_other: 'Do {{count}} things',
        },
      },
    },
  },
};

/** Loads `content` (written to a temp `badges.yaml`), returning issues instead of throwing. */
function loadIssues(
  content: string,
  locales: Locales = LOCALES,
  minigames: readonly MiniGame[] = [],
): string[] {
  try {
    loadBadges(write(content), locales, CATALOG, [LESSON], minigames, NO_SUBJECT_BADGES);
    return [];
  } catch (error) {
    if (error instanceof ContentError) return [...error.issues];
    throw error;
  }
}

describe('loadBadges', () => {
  it('compiles a valid file to BadgeDef[], deriving name/condition keys from id', () => {
    const badges = loadBadges(
      write(`
badges:
  - id: has-name
    category: skill
    condition: { type: stars-total, thresholds: [50] }
`),
      LOCALES,
      CATALOG,
      [LESSON],
      [],
      NO_SUBJECT_BADGES,
    );
    expect(badges).toEqual([
      {
        id: 'has-name',
        category: 'skill',
        nameKey: 'rewards:badges.has-name.name',
        conditionKey: 'rewards:badges.has-name.condition',
        condition: { type: 'stars-total', thresholds: [50] },
      },
    ]);
  });

  it('reports a duplicate badge id', () => {
    const issues = loadIssues(`
badges:
  - id: has-name
    category: skill
    condition: { type: stars-total, thresholds: [1] }
  - id: has-name
    category: skill
    condition: { type: stars-total, thresholds: [2] }
`);
    expect(issues).toEqual([expect.stringContaining('duplicate id')]);
  });

  it('reports non-ascending thresholds', () => {
    const issues = loadIssues(`
badges:
  - id: has-name
    category: skill
    condition: { type: stars-total, thresholds: [50, 50] }
`);
    expect(issues).toEqual([expect.stringContaining('thresholds must be strictly ascending')]);
  });

  it('reports a "mastered" condition with no scope', () => {
    const issues = loadIssues(`
badges:
  - id: has-name
    category: milestone
    condition: { type: mastered, thresholds: [1] }
`);
    expect(issues).toEqual([expect.stringContaining('requires "scope"')]);
  });

  it('reports a "mastered" scope referencing an unknown world', () => {
    const issues = loadIssues(`
badges:
  - id: has-name
    category: milestone
    condition: { type: mastered, scope: 'world:not-real', thresholds: [1] }
`);
    expect(issues).toEqual([expect.stringContaining('unknown world "not-real"')]);
  });

  it('reports a "mastered" scope referencing an unknown track', () => {
    const issues = loadIssues(`
badges:
  - id: has-name
    category: milestone
    condition: { type: mastered, scope: 'track:not-real', thresholds: [1] }
`);
    expect(issues).toEqual([expect.stringContaining('unknown track "not-real"')]);
  });

  it('reports a "mastered" scope in the wrong shape', () => {
    const issues = loadIssues(`
badges:
  - id: has-name
    category: milestone
    condition: { type: mastered, scope: 'board', thresholds: [1] }
`);
    expect(issues).toEqual([expect.stringContaining('scope must be')]);
  });

  it('accepts a "minigame-won" condition naming a mini-game of the subject', () => {
    const issues = loadIssues(
      `
badges:
  - id: has-name
    category: skill
    condition: { type: minigame-won, scope: 'minigame:bug-squash', thresholds: [1] }
`,
      LOCALES,
      [BUG_SQUASH],
    );
    expect(issues).toEqual([]);
  });

  it('reports a "minigame-won" scope referencing an unknown mini-game', () => {
    const issues = loadIssues(
      `
badges:
  - id: has-name
    category: skill
    condition: { type: minigame-won, scope: 'minigame:not-real', thresholds: [1] }
`,
      LOCALES,
      [BUG_SQUASH],
    );
    expect(issues).toEqual([expect.stringContaining('unknown mini-game "not-real"')]);
  });

  it('reports a "minigame-won" condition with no scope, or a scope in the wrong shape', () => {
    const none = loadIssues(
      `
badges:
  - id: has-name
    category: skill
    condition: { type: minigame-won, thresholds: [1] }
`,
      LOCALES,
      [BUG_SQUASH],
    );
    expect(none).toEqual([expect.stringContaining('requires "scope"')]);
    const wrong = loadIssues(
      `
badges:
  - id: has-name
    category: skill
    condition: { type: minigame-won, scope: 'bug-squash', thresholds: [1] }
`,
      LOCALES,
      [BUG_SQUASH],
    );
    expect(wrong).toEqual([expect.stringContaining('scope must be "minigame:<id>"')]);
  });

  it('reports a "minigame-won" condition with more than one threshold', () => {
    const issues = loadIssues(
      `
badges:
  - id: has-name
    category: skill
    condition: { type: minigame-won, scope: 'minigame:bug-squash', thresholds: [1, 2] }
`,
      LOCALES,
      [BUG_SQUASH],
    );
    expect(issues).toEqual([expect.stringContaining('thresholds must be [1]')]);
  });

  it('reports a "concept-correct" condition with no concept', () => {
    const issues = loadIssues(`
badges:
  - id: has-name
    category: skill
    condition: { type: concept-correct, thresholds: [10] }
`);
    expect(issues).toEqual([expect.stringContaining('requires "concept"')]);
  });

  it('reports a "concept-correct" condition referencing an unknown concept', () => {
    const issues = loadIssues(`
badges:
  - id: has-name
    category: skill
    condition: { type: concept-correct, concept: not-real, thresholds: [10] }
`);
    expect(issues).toEqual([expect.stringContaining('unknown concept "not-real"')]);
  });

  it('reports both inARow and noHints set on the same condition', () => {
    const issues = loadIssues(`
badges:
  - id: has-name
    category: skill
    condition: { type: concept-correct, concept: rook-move, inARow: true, noHints: true, thresholds: [10] }
`);
    expect(issues).toEqual([expect.stringContaining('cannot both be set')]);
  });

  it('reports a missing name/condition locale key', () => {
    const issues = loadIssues(
      `
badges:
  - id: no-locale
    category: skill
    condition: { type: stars-total, thresholds: [1] }
`,
      { en: { rewards: {} } },
    );
    expect(issues).toEqual([
      expect.stringContaining('missing text key "rewards:badges.no-locale.name"'),
      expect.stringContaining('missing text key "rewards:badges.no-locale.condition"'),
    ]);
  });

  it('accepts a pluralized (`_one`/`_other`) condition key', () => {
    expect(
      loadIssues(`
badges:
  - id: plural-one
    category: skill
    condition: { type: stars-total, thresholds: [1] }
`),
    ).toEqual([]);
  });
});
