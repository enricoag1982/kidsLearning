import { beforeEach, describe, expect, it } from 'vitest';
import { chessWeb } from '@learn/subject-chess/web/chess-pack.ts';
import { mathWeb } from '@learn/subject-math/web/math-pack.ts';
import { createServices } from '@learn/platform-web/app/services.ts';
import { KIDS_APP_CONFIG } from '../app-config.ts';

beforeEach(() => {
  localStorage.clear();
});

function storedKeys(): readonly string[] {
  return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index) ?? '');
}

describe('createServices', () => {
  it('wires deps, subject services and narrator over the given storage', async () => {
    const services = createServices([chessWeb, mathWeb], KIDS_APP_CONFIG, localStorage);

    expect(services.narrator).toBeDefined();
    expect(services.subject).toBeDefined();
    expect(typeof services.deps.clock.now).toBe('function');
    expect(services.deps.ids.next()).not.toBe(services.deps.ids.next());

    expect(await services.deps.profiles.list()).toEqual([]);
    expect(services.deps.content.lesson('rook')?.id).toBe('rook');

    const now = services.deps.clock.now().toISOString();
    await services.deps.progress.saveLesson({
      id: 'p1',
      profileId: 'profile-1',
      lessonId: 'rook',
      bestStars: {},
      bossStars: 0,
      resumeStep: 0,
      createdAt: now,
      updatedAt: now,
    });
    expect(await services.deps.progress.getLesson('profile-1', 'rook')).toBeDefined();
  });

  it('persists profile data across separate createServices calls over the same storage', async () => {
    const first = createServices([chessWeb, mathWeb], KIDS_APP_CONFIG, localStorage);
    await first.deps.profiles.save({
      id: 'p1',
      accountId: 'local',
      nickname: 'Rex',
      avatar: 'fox',
      locale: 'en',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const second = createServices([chessWeb, mathWeb], KIDS_APP_CONFIG, localStorage);
    expect(await second.deps.profiles.get('p1')).toMatchObject({ nickname: 'Rex' });
  });

  it('keeps profiles in the shared kids: store and a subject’s progress in its own kids-<id>: store', async () => {
    const services = createServices([chessWeb, mathWeb], KIDS_APP_CONFIG, localStorage);
    const now = services.deps.clock.now().toISOString();
    await services.deps.profiles.save({
      id: 'p1',
      accountId: 'local',
      nickname: 'Rex',
      avatar: 'fox',
      locale: 'en',
      createdAt: now,
      updatedAt: now,
    });
    await services.deps.progress.saveLesson({
      id: 'lp1',
      profileId: 'p1',
      lessonId: 'rook',
      bestStars: { 'rook-01': 3 },
      bossStars: 0,
      resumeStep: 0,
      createdAt: now,
      updatedAt: now,
    });

    const keys = storedKeys();
    expect(keys).toContain('kids:profiles');
    expect(keys).toContain('kids-chess:lesson-progress');
    expect(keys).not.toContain('kids:lesson-progress');
    expect(keys).not.toContain('kids-math:lesson-progress');
    expect(keys.filter((key) => !/^kids(-chess|-math)?:/.test(key))).toEqual([]);
  });

  it('keeps each subject’s progress apart', async () => {
    const app = createServices([chessWeb, mathWeb], KIDS_APP_CONFIG, localStorage).app;
    const chess = await app.activate('chess');
    const math = await app.activate('math');
    const now = chess.deps.clock.now().toISOString();
    await chess.deps.progress.saveLesson({
      id: 'lp1',
      profileId: 'p1',
      lessonId: 'rook',
      bestStars: {},
      bossStars: 0,
      resumeStep: 0,
      createdAt: now,
      updatedAt: now,
    });

    expect(await chess.deps.progress.listLessons('p1')).toHaveLength(1);
    expect(await math.deps.progress.listLessons('p1')).toEqual([]);
  });

  it('defaults to window.localStorage', () => {
    const services = createServices([chessWeb, mathWeb], KIDS_APP_CONFIG);
    expect(services.deps).toBeDefined();
  });
});
