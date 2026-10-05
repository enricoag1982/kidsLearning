import { describe, expect, it } from 'vitest';
import { checkRewards } from '@learn/platform-core/app/rewards';
import { newEarnedBadge } from '@learn/platform-core/domain/badges';
import {
  makeAttempt,
  makeClock,
  makeDeps,
  makeMiniGameProgress,
  makeProgressRepo,
  makeRewardsRepo,
} from '@learn/platform-core/testing';
import { codingEntry } from '../entry.ts';

const NOW = new Date('2026-02-02T10:00:00.000Z');
const PROFILE = 'profile-1';

/** Coding's real compiled content (lessons, catalog, badges) on the platform's in-memory ports. */
async function setup(opts: {
  readonly miniGames?: Parameters<typeof makeMiniGameProgress>[0][];
  readonly debugHunts?: number;
  readonly alreadyEarned?: boolean;
}) {
  const { pack } = await codingEntry.load();
  const rewards = makeRewardsRepo({
    badges: opts.alreadyEarned
      ? [newEarnedBadge('old-1', PROFILE, 'bug-squasher', undefined, NOW)]
      : [],
  });
  const attempts = Array.from({ length: opts.debugHunts ?? 0 }, (_, index) =>
    makeAttempt({
      id: `hunt-${String(index)}`,
      lessonId: 'seq-debug',
      exerciseId: `debug-0${String(index)}`,
      conceptId: 'seq-debug',
    }),
  );
  const deps = makeDeps({
    content: pack.createServices().content,
    clock: makeClock(NOW),
    rewards,
    progress: makeProgressRepo({
      attempts,
      miniGames: (opts.miniGames ?? []).map((overrides) => makeMiniGameProgress(overrides)),
    }),
  });
  return { deps, rewards };
}

describe('coding badge Bug Squasher (Bug Squash won)', () => {
  it('is earned by a Bug Squash win, from the Journey boss node or from Play alike', async () => {
    const { deps, rewards } = await setup({ miniGames: [{ miniGameId: 'bug-squash', wins: 1 }] });

    const { newBadges } = await checkRewards(deps, PROFILE);

    expect(newBadges.map((badge) => badge.badgeId)).toEqual(['bug-squasher']);
    expect((await rewards.listEarnedBadges(PROFILE)).map((badge) => badge.badgeId)).toEqual([
      'bug-squasher',
    ]);
  });

  it('is not earned by playing Bug Squash without a win, another mini-game win, or five clean bug hunts', async () => {
    const { deps } = await setup({
      miniGames: [
        { miniGameId: 'bug-squash', wins: 0, plays: 3 },
        { id: 'mg-2', miniGameId: 'fence-builder', wins: 2 },
      ],
      debugHunts: 5,
    });

    const { newBadges } = await checkRewards(deps, PROFILE);

    expect(newBadges.map((badge) => badge.badgeId)).toEqual([]);
  });

  it('is kept by a child who earned it under the old rule (5 clean bug hunts, Bug Squash never won)', async () => {
    const { deps, rewards } = await setup({ alreadyEarned: true, debugHunts: 5 });

    const first = await checkRewards(deps, PROFILE);
    const second = await checkRewards(deps, PROFILE);

    expect(first.newBadges).toEqual([]);
    expect(second.newBadges).toEqual([]);
    const earned = await rewards.listEarnedBadges(PROFILE);
    expect(earned.map((badge) => [badge.id, badge.badgeId])).toEqual([['old-1', 'bug-squasher']]);
  });

  it('is not earned twice when Bug Squash is won later by a child who already holds it', async () => {
    const { deps, rewards } = await setup({
      alreadyEarned: true,
      miniGames: [{ miniGameId: 'bug-squash', wins: 1 }],
    });

    const { newBadges } = await checkRewards(deps, PROFILE);

    expect(newBadges).toEqual([]);
    expect(await rewards.listEarnedBadges(PROFILE)).toHaveLength(1);
  });
});
