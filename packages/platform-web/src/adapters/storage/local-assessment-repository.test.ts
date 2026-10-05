import { beforeEach, describe, expect, it } from 'vitest';
import type { AssessmentResult, PlacementDecision, Unlock } from '@learn/platform-core';
import { StorageError } from './local-store.ts';
import { openTestStore } from '../../testing/open-test-store.ts';
import { LocalStorageAssessmentRepository } from './local-assessment-repository.ts';

function makeResult(overrides: Partial<AssessmentResult> = {}): AssessmentResult {
  return {
    id: 'ar1',
    profileId: 'profile-1',
    kind: 'test-out',
    scope: { type: 'lesson', lessonId: 'rook', worldId: 'pieces' },
    correct: 4,
    total: 5,
    passed: true,
    at: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeUnlock(overrides: Partial<Unlock> = {}): Unlock {
  return {
    id: 'u1',
    profileId: 'profile-1',
    targetType: 'lesson',
    targetId: 'rook',
    via: 'test-out',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeDecision(overrides: Partial<PlacementDecision> = {}): PlacementDecision {
  return {
    id: 'pd1',
    profileId: 'profile-1',
    decision: 'declined',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

function makeRepo(): LocalStorageAssessmentRepository {
  const store = openTestStore();
  return new LocalStorageAssessmentRepository(store);
}

describe('LocalStorageAssessmentRepository', () => {
  it('adds and lists assessment results, filtered by profile', async () => {
    const repo = makeRepo();
    await repo.addAssessmentResult(makeResult({ id: 'ar1', profileId: 'profile-1' }));
    await repo.addAssessmentResult(makeResult({ id: 'ar2', profileId: 'profile-2' }));

    expect(await repo.listAssessmentResults('profile-1')).toHaveLength(1);
    expect(await repo.listAssessmentResults('profile-2')).toHaveLength(1);
  });

  it('adds and lists unlocks, filtered by profile', async () => {
    const repo = makeRepo();
    await repo.addUnlock(makeUnlock({ id: 'u1', profileId: 'profile-1', targetId: 'rook' }));
    await repo.addUnlock(
      makeUnlock({ id: 'u2', profileId: 'profile-1', targetType: 'world', targetId: 'pieces' }),
    );
    await repo.addUnlock(makeUnlock({ id: 'u3', profileId: 'profile-2' }));

    const unlocks = await repo.listUnlocks('profile-1');
    expect(unlocks).toHaveLength(2);
    expect(unlocks.map((u) => u.targetId).sort()).toEqual(['pieces', 'rook']);
  });

  it('keeps one placement decision per profile: none yet, saved, replaced by a later one', async () => {
    const repo = makeRepo();
    expect(await repo.getPlacementDecision('profile-1')).toBeUndefined();

    await repo.savePlacementDecision(makeDecision());
    await repo.savePlacementDecision(makeDecision({ id: 'pd2', profileId: 'profile-2' }));
    expect(await repo.getPlacementDecision('profile-1')).toEqual(makeDecision());

    await repo.savePlacementDecision(makeDecision({ decision: 'taken' }));
    expect((await repo.getPlacementDecision('profile-1'))?.decision).toBe('taken');
    expect((await repo.getPlacementDecision('profile-2'))?.decision).toBe('declined');
  });

  it('a placement decision survives reopening the store (same keys, new repository)', async () => {
    await makeRepo().savePlacementDecision(makeDecision({ decision: 'taken' }));

    const again = makeRepo();

    expect((await again.getPlacementDecision('profile-1'))?.decision).toBe('taken');
  });

  it('deleteProfileData removes results, unlocks and the decision for that profile only', async () => {
    const repo = makeRepo();
    await repo.addAssessmentResult(makeResult({ id: 'ar1', profileId: 'profile-1' }));
    await repo.addAssessmentResult(makeResult({ id: 'ar2', profileId: 'profile-2' }));
    await repo.addUnlock(makeUnlock({ id: 'u1', profileId: 'profile-1' }));
    await repo.addUnlock(makeUnlock({ id: 'u2', profileId: 'profile-2' }));
    await repo.savePlacementDecision(makeDecision({ id: 'pd1', profileId: 'profile-1' }));
    await repo.savePlacementDecision(makeDecision({ id: 'pd2', profileId: 'profile-2' }));

    await repo.deleteProfileData('profile-1');

    expect(await repo.getPlacementDecision('profile-1')).toBeUndefined();
    expect(await repo.getPlacementDecision('profile-2')).toBeDefined();
    expect(await repo.listAssessmentResults('profile-1')).toEqual([]);
    expect(await repo.listAssessmentResults('profile-2')).toHaveLength(1);
    expect(await repo.listUnlocks('profile-1')).toEqual([]);
    expect(await repo.listUnlocks('profile-2')).toHaveLength(1);
  });

  it('rejects with StorageError on corrupt data at either key', async () => {
    const store = openTestStore();
    localStorage.setItem('chess-kids:assessment-results', JSON.stringify({ not: 'an array' }));
    const repo = new LocalStorageAssessmentRepository(store);

    await expect(repo.listAssessmentResults('profile-1')).rejects.toThrow(StorageError);
  });

  it('rejects with StorageError on a corrupt placement decision record', async () => {
    const store = openTestStore();
    localStorage.setItem('chess-kids:placement-decisions', JSON.stringify({ p: { id: 1 } }));
    const repo = new LocalStorageAssessmentRepository(store);

    await expect(repo.getPlacementDecision('p')).rejects.toThrow(StorageError);
  });
});
