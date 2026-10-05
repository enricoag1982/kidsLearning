import { describe, expect, it } from 'vitest';

import type { AssessmentResult, PlacementDecision, Unlock } from './assessment.ts';
import type { EarnedBadge } from './badges.ts';
import {
  emptyProfileData,
  emptySubjectProfileData,
  mergeConceptStats,
  mergeEarnedBadges,
  mergeLessonProgress,
  mergeMiniGameProgress,
  mergePlacementDecision,
  mergeProfileData,
  mergeProfileSettings,
  mergeSessionLogs,
  mergeStreak,
  mergeUnlocks,
  profileBadgeCount,
  profileStarsTotal,
  rekeyProfileData,
  totalMinutesOverDays,
} from './merge.ts';
import type { MergeableProfileData, SubjectProfileData } from './merge.ts';
import { composeDefaultSettings } from './profile-settings.ts';
import type { ProfileSettings } from './profile-settings.ts';

/** This domain test has no real subject: enough of `ProfileSettings` to exercise merge logic. */
const DEFAULT_PROFILE_SETTINGS = composeDefaultSettings({ defaults: {} });
import type { Attempt, GameRecord, LessonProgress, MiniGameProgress } from './progress.ts';
import type { ConceptStats } from './review.ts';
import type { SessionLog } from './session-log.ts';
import type { Streak } from './streak.ts';

const NOW = new Date('2026-01-10T12:00:00.000Z');
const EARLIER = new Date('2026-01-05T09:00:00.000Z');
const LATER = new Date('2026-01-08T09:00:00.000Z');

function lessonProgress(overrides: Partial<LessonProgress> = {}): LessonProgress {
  return {
    id: 'lp-local',
    profileId: 'p1',
    lessonId: 'l1',
    bestStars: {},
    bossStars: 0,
    resumeStep: 0,
    createdAt: EARLIER.toISOString(),
    updatedAt: EARLIER.toISOString(),
    ...overrides,
  };
}

describe('mergeLessonProgress', () => {
  it('keeps a lesson present only locally, and one present only in incoming, unchanged', () => {
    const local = [lessonProgress({ lessonId: 'local-only' })];
    const incoming = [lessonProgress({ id: 'lp-incoming', lessonId: 'incoming-only' })];
    const merged = mergeLessonProgress(local, incoming, NOW);
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.lessonId === 'local-only')).toBe(local[0]);
    expect(merged.find((p) => p.lessonId === 'incoming-only')).toBe(incoming[0]);
  });

  it('bestStars: max per exercise id', () => {
    const local = [lessonProgress({ bestStars: { 'l1-01': 2, 'l1-02': 3 } })];
    const incoming = [lessonProgress({ id: 'lp-i', bestStars: { 'l1-01': 3, 'l1-03': 1 } })];
    const merged = mergeLessonProgress(local, incoming, NOW);
    expect(merged[0]?.bestStars).toEqual({ 'l1-01': 3, 'l1-02': 3, 'l1-03': 1 });
  });

  it('bossStars: max', () => {
    const local = [lessonProgress({ bossStars: 1 })];
    const incoming = [lessonProgress({ id: 'lp-i', bossStars: 3 })];
    expect(mergeLessonProgress(local, incoming, NOW)[0]?.bossStars).toBe(3);
  });

  it('completedAt: earliest of the two', () => {
    const local = [lessonProgress({ completedAt: LATER.toISOString() })];
    const incoming = [lessonProgress({ id: 'lp-i', completedAt: EARLIER.toISOString() })];
    expect(mergeLessonProgress(local, incoming, NOW)[0]?.completedAt).toBe(EARLIER.toISOString());
  });

  it('completedAt: the defined side when only one has it', () => {
    const local = [lessonProgress({ completedAt: undefined })];
    const incoming = [lessonProgress({ id: 'lp-i', completedAt: LATER.toISOString() })];
    expect(mergeLessonProgress(local, incoming, NOW)[0]?.completedAt).toBe(LATER.toISOString());
  });

  it('masteredVia: kept if either has it, local wins a real conflict', () => {
    const localOnly = mergeLessonProgress(
      [lessonProgress({ masteredVia: undefined })],
      [lessonProgress({ id: 'lp-i', masteredVia: 'test-out' })],
      NOW,
    );
    expect(localOnly[0]?.masteredVia).toBe('test-out');

    const conflict = mergeLessonProgress(
      [lessonProgress({ masteredVia: 'parent' })],
      [lessonProgress({ id: 'lp-i', masteredVia: 'test-out' })],
      NOW,
    );
    expect(conflict[0]?.masteredVia).toBe('parent');
  });

  it('resumeStep/skippedPhases: taken together from the newer updatedAt, never mixed', () => {
    const local = [
      lessonProgress({ updatedAt: EARLIER.toISOString(), resumeStep: 1, skippedPhases: ['story'] }),
    ];
    const incoming = [
      lessonProgress({
        id: 'lp-i',
        updatedAt: LATER.toISOString(),
        resumeStep: 4,
        skippedPhases: undefined,
      }),
    ];
    const merged = mergeLessonProgress(local, incoming, NOW)[0];
    expect(merged?.resumeStep).toBe(4);
    expect(merged?.skippedPhases).toBeUndefined();
  });

  it('a no-op merge (incoming brings nothing new) returns the local record unchanged', () => {
    const local = [lessonProgress({ bestStars: { 'l1-01': 3 }, bossStars: 3 })];
    const incoming = [lessonProgress({ id: 'lp-i', bestStars: { 'l1-01': 2 }, bossStars: 1 })];
    const merged = mergeLessonProgress(local, incoming, NOW)[0];
    expect(merged).toBe(local[0]);
  });
});

function miniGame(overrides: Partial<MiniGameProgress> = {}): MiniGameProgress {
  return {
    id: 'mg-local',
    profileId: 'p1',
    miniGameId: 'square-hunt',
    bestStars: 1,
    plays: 2,
    wins: 1,
    createdAt: EARLIER.toISOString(),
    updatedAt: EARLIER.toISOString(),
    ...overrides,
  };
}

describe('mergeMiniGameProgress', () => {
  it('best-of every field: bestStars, plays, wins', () => {
    const local = [miniGame({ bestStars: 1, plays: 5, wins: 1 })];
    const incoming = [miniGame({ id: 'mg-i', bestStars: 3, plays: 2, wins: 2 })];
    const merged = mergeMiniGameProgress(local, incoming, NOW)[0];
    expect(merged).toMatchObject({ bestStars: 3, plays: 5, wins: 2 });
  });

  it('unchanged merge keeps the local record', () => {
    const local = [miniGame({ bestStars: 3, plays: 5, wins: 5 })];
    const incoming = [miniGame({ id: 'mg-i', bestStars: 1, plays: 1, wins: 0 })];
    expect(mergeMiniGameProgress(local, incoming, NOW)[0]).toBe(local[0]);
  });
});

function concept(overrides: Partial<ConceptStats> = {}): ConceptStats {
  return {
    id: 'cs-local',
    profileId: 'p1',
    conceptId: 'rook-move',
    recent: [true, false],
    createdAt: EARLIER.toISOString(),
    updatedAt: EARLIER.toISOString(),
    ...overrides,
  };
}

describe('mergeConceptStats', () => {
  it('keeps the record with the newer updatedAt, whole (not field-by-field)', () => {
    const local = [concept({ updatedAt: EARLIER.toISOString(), recent: [true], box: 2 })];
    const incoming = [
      concept({ id: 'cs-i', updatedAt: LATER.toISOString(), recent: [false, false], box: 1 }),
    ];
    const merged = mergeConceptStats(local, incoming)[0];
    expect(merged?.recent).toEqual([false, false]);
    expect(merged?.box).toBe(1);
    expect(merged?.id).toBe('cs-local'); // keeps the local record's own id
  });

  it('local wins when it is the newer side', () => {
    const local = [concept({ updatedAt: LATER.toISOString() })];
    const incoming = [concept({ id: 'cs-i', updatedAt: EARLIER.toISOString() })];
    expect(mergeConceptStats(local, incoming)[0]).toBe(local[0]);
  });
});

describe('mergeEarnedBadges', () => {
  function badge(overrides: Partial<EarnedBadge> = {}): EarnedBadge {
    return {
      id: 'b-local',
      profileId: 'p1',
      badgeId: 'first-win',
      at: LATER.toISOString(),
      seen: false,
      createdAt: LATER.toISOString(),
      updatedAt: LATER.toISOString(),
      ...overrides,
    };
  }

  it('union by badge id + tier; earliest at; seen true if either is seen', () => {
    const local = [badge({ at: LATER.toISOString(), seen: false })];
    const incoming = [badge({ id: 'b-i', at: EARLIER.toISOString(), seen: true })];
    const merged = mergeEarnedBadges(local, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.at).toBe(EARLIER.toISOString());
    expect(merged[0]?.seen).toBe(true);
  });

  it('keeps tiers of the same badge distinct', () => {
    const local = [badge({ id: 'b-bronze', tier: 'bronze' })];
    const incoming = [badge({ id: 'b-silver', tier: 'silver' })];
    expect(mergeEarnedBadges(local, incoming)).toHaveLength(2);
  });

  it('a badge earned only locally, or only incoming, is kept as-is', () => {
    const local = [badge({ badgeId: 'local-only' })];
    const incoming = [badge({ id: 'b-i', badgeId: 'incoming-only' })];
    const merged = mergeEarnedBadges(local, incoming);
    expect(merged.find((b) => b.badgeId === 'local-only')).toBe(local[0]);
    expect(merged.find((b) => b.badgeId === 'incoming-only')).toBe(incoming[0]);
  });
});

describe('mergeStreak', () => {
  function streak(overrides: Partial<Streak> = {}): Streak {
    return {
      id: 's-local',
      profileId: 'p1',
      current: 2,
      best: 5,
      skipsUsedThisWeek: 0,
      createdAt: EARLIER.toISOString(),
      updatedAt: EARLIER.toISOString(),
      ...overrides,
    };
  }

  it('best: max of both', () => {
    const local = streak({ best: 5 });
    const incoming = streak({ id: 's-i', best: 9 });
    expect(mergeStreak(local, incoming)?.best).toBe(9);
  });

  it('current/lastDay/skipsUsedThisWeek: taken together from the later lastDay', () => {
    const local = streak({ lastDay: '2026-01-05', current: 3, skipsUsedThisWeek: 1 });
    const incoming = streak({
      id: 's-i',
      lastDay: '2026-01-09',
      current: 1,
      skipsUsedThisWeek: 0,
    });
    const merged = mergeStreak(local, incoming);
    expect(merged?.lastDay).toBe('2026-01-09');
    expect(merged?.current).toBe(1);
    expect(merged?.skipsUsedThisWeek).toBe(0);
  });

  it('a tied lastDay keeps the higher current', () => {
    const local = streak({ lastDay: '2026-01-05', current: 4 });
    const incoming = streak({ id: 's-i', lastDay: '2026-01-05', current: 7 });
    expect(mergeStreak(local, incoming)?.current).toBe(7);
  });

  it('either side missing returns the other, both missing returns undefined', () => {
    const s = streak();
    expect(mergeStreak(undefined, s)).toBe(s);
    expect(mergeStreak(s, undefined)).toBe(s);
    expect(mergeStreak(undefined, undefined)).toBeUndefined();
  });
});

describe('mergeProfileSettings', () => {
  function settings(overrides: Partial<ProfileSettings> = {}): ProfileSettings {
    return { ...DEFAULT_PROFILE_SETTINGS, ...overrides };
  }

  it('newest wins by updatedAt', () => {
    const local = settings({ hints: false, updatedAt: EARLIER.toISOString() });
    const incoming = settings({ hints: true, updatedAt: LATER.toISOString() });
    expect(mergeProfileSettings(local, incoming)).toEqual(incoming);
  });

  it('missing updatedAt reads as oldest — the side with a real timestamp wins', () => {
    const local = settings({ hints: false, updatedAt: undefined });
    const incoming = settings({ hints: true, updatedAt: EARLIER.toISOString() });
    expect(mergeProfileSettings(local, incoming)).toEqual(incoming);
    // and the reverse: local has the real timestamp, incoming has none.
    expect(mergeProfileSettings(incoming, local)).toEqual(incoming);
  });

  it('both missing updatedAt keeps local', () => {
    const local = settings({ hints: false, updatedAt: undefined });
    const incoming = settings({ hints: true, updatedAt: undefined });
    expect(mergeProfileSettings(local, incoming)).toBe(local);
  });
});

function sessionLog(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log-local',
    profileId: 'p1',
    date: '2026-01-10',
    minutes: 10,
    createdAt: EARLIER.toISOString(),
    updatedAt: EARLIER.toISOString(),
    ...overrides,
  };
}

describe('mergeSessionLogs', () => {
  it('a foreign device row for the same date is kept alongside this device’s own, not merged into it', () => {
    const local = [sessionLog({ deviceId: 'device-a', minutes: 10 })];
    const incoming = [sessionLog({ id: 'log-b', deviceId: 'device-b', minutes: 15 })];
    const merged = mergeSessionLogs(local, incoming, NOW);
    expect(merged).toHaveLength(2);
    expect(merged.reduce((sum, log) => sum + log.minutes, 0)).toBe(25);
  });

  it('the same device’s row on both sides: keeps the larger minutes/extraMinutes, later hoursOverrideUntil/warnedAt', () => {
    const local = [
      sessionLog({
        deviceId: 'device-a',
        minutes: 10,
        extraMinutes: 5,
        warnedAt: EARLIER.toISOString(),
      }),
    ];
    const incoming = [
      sessionLog({
        id: 'log-a2',
        deviceId: 'device-a',
        minutes: 25,
        extraMinutes: 0,
        warnedAt: LATER.toISOString(),
      }),
    ];
    const merged = mergeSessionLogs(local, incoming, NOW)[0];
    expect(merged?.minutes).toBe(25);
    expect(merged?.extraMinutes).toBe(5);
    expect(merged?.warnedAt).toBe(LATER.toISOString());
  });

  it('re-merging the identical incoming row a second time changes nothing (no double count)', () => {
    const local = [sessionLog({ deviceId: 'device-a', minutes: 10 })];
    const incoming = [sessionLog({ id: 'log-b', deviceId: 'device-b', minutes: 15 })];
    const once = mergeSessionLogs(local, incoming, NOW);
    const twice = mergeSessionLogs(once, incoming, NOW);
    expect(twice).toEqual(once);
    expect(twice.reduce((sum, log) => sum + log.minutes, 0)).toBe(25);
  });

  it('two devices’ legacy (no deviceId) rows for the same date are kept as separate rows, not conflated', () => {
    const local = [sessionLog({ id: 'legacy-local', deviceId: undefined, minutes: 10 })];
    const incoming = [sessionLog({ id: 'legacy-incoming', deviceId: undefined, minutes: 15 })];
    const merged = mergeSessionLogs(local, incoming, NOW);
    expect(merged).toHaveLength(2);
  });
});

describe('mergeUnlocks', () => {
  function unlock(overrides: Partial<Unlock> = {}): Unlock {
    return {
      id: 'u-local',
      profileId: 'p1',
      targetType: 'lesson',
      targetId: 'l1',
      via: 'test-out',
      createdAt: EARLIER.toISOString(),
      updatedAt: EARLIER.toISOString(),
      ...overrides,
    };
  }

  it('unions by target, no duplicate for the same target', () => {
    const local = [unlock()];
    const incoming = [unlock({ id: 'u-i' })];
    expect(mergeUnlocks(local, incoming)).toHaveLength(1);
  });

  it('keeps unlocks unique to either side', () => {
    const local = [unlock({ targetId: 'l1' })];
    const incoming = [unlock({ id: 'u-i', targetId: 'l2' })];
    expect(mergeUnlocks(local, incoming)).toHaveLength(2);
  });
});

describe('mergePlacementDecision', () => {
  function decision(overrides: Partial<PlacementDecision> = {}): PlacementDecision {
    return {
      id: 'pd-local',
      profileId: 'p1',
      decision: 'declined',
      createdAt: EARLIER.toISOString(),
      updatedAt: EARLIER.toISOString(),
      ...overrides,
    };
  }

  it('is the other side when only one has answered, and nothing when neither has', () => {
    const answered = decision();
    expect(mergePlacementDecision(undefined, answered)).toBe(answered);
    expect(mergePlacementDecision(answered, undefined)).toBe(answered);
    expect(mergePlacementDecision(undefined, undefined)).toBeUndefined();
  });

  it('taken beats declined, whichever side holds it', () => {
    const taken = decision({ id: 'pd-taken', decision: 'taken' });
    const declined = decision({ id: 'pd-declined', decision: 'declined' });
    expect(mergePlacementDecision(declined, taken)).toBe(taken);
    expect(mergePlacementDecision(taken, declined)).toBe(taken);
    // Even when the declined answer is the newer one.
    const newerDeclined = decision({ decision: 'declined', updatedAt: LATER.toISOString() });
    expect(mergePlacementDecision(taken, newerDeclined)).toBe(taken);
    expect(mergePlacementDecision(newerDeclined, taken)).toBe(taken);
  });

  it('keeps local when both gave the same answer (a re-merge changes nothing)', () => {
    const local = decision({ id: 'pd-a' });
    const incoming = decision({ id: 'pd-b' });
    expect(mergePlacementDecision(local, incoming)).toBe(local);
    const takenLocal = decision({ id: 'pd-a', decision: 'taken' });
    expect(mergePlacementDecision(takenLocal, decision({ id: 'pd-b', decision: 'taken' }))).toBe(
      takenLocal,
    );
  });
});

/** One-subject profile data (subject `main`) from flat overrides: the per-subject lists go into `subjects.main`. */
function fullProfileData(
  overrides: Partial<SubjectProfileData> &
    Partial<Pick<MergeableProfileData, 'settings' | 'streak' | 'sessionLogs'>> = {},
): MergeableProfileData {
  const { settings, streak, sessionLogs, ...records } = overrides;
  return {
    settings: settings ?? DEFAULT_PROFILE_SETTINGS,
    ...(streak === undefined ? {} : { streak }),
    sessionLogs: sessionLogs ?? [],
    subjects: { main: { ...emptySubjectProfileData(), ...records } },
  };
}

/** `data.subjects[id]`, or throws (lint-friendly stand-in for a non-null assertion). */
function subjectOf(data: MergeableProfileData, id = 'main'): SubjectProfileData {
  const subject = data.subjects[id];
  if (subject === undefined) throw new Error(`no subject "${id}" in merged data`);
  return subject;
}

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: 'a-local',
    profileId: 'p1',
    lessonId: 'l1',
    exerciseId: 'l1-01',
    conceptId: 'c1',
    scored: true,
    correct: true,
    stars: 3,
    hints: 0,
    errors: 0,
    moves: 1,
    durationMs: 1000,
    createdAt: EARLIER.toISOString(),
    updatedAt: EARLIER.toISOString(),
    ...overrides,
  };
}

function gameRecord(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    id: 'g-local',
    profileId: 'p1',
    game: 'full',
    opponent: 'computer:1',
    result: 'win',
    reason: 'checkmate',
    moves: [],
    createdAt: EARLIER.toISOString(),
    updatedAt: EARLIER.toISOString(),
    ...overrides,
  };
}

function assessmentResult(overrides: Partial<AssessmentResult> = {}): AssessmentResult {
  return {
    id: 'ar-local',
    profileId: 'p1',
    kind: 'test-out',
    scope: { type: 'lesson', lessonId: 'l1', worldId: 'w1' },
    correct: 4,
    total: 5,
    passed: true,
    at: EARLIER.toISOString(),
    createdAt: EARLIER.toISOString(),
    updatedAt: EARLIER.toISOString(),
    ...overrides,
  };
}

describe('mergeProfileData', () => {
  it('unions attempts/gameRecords/assessmentResults by id', () => {
    const local = fullProfileData({
      attempts: [attempt({ id: 'a1' })],
      gameRecords: [gameRecord({ id: 'g1' })],
      assessmentResults: [assessmentResult({ id: 'ar1' })],
    });
    const incoming = fullProfileData({
      attempts: [attempt({ id: 'a2' })],
      gameRecords: [gameRecord({ id: 'g2' })],
      assessmentResults: [assessmentResult({ id: 'ar2' })],
    });
    const merged = mergeProfileData(local, incoming, NOW);
    const main = subjectOf(merged);
    expect(main.attempts.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
    expect(main.gameRecords.map((g) => g.id).sort()).toEqual(['g1', 'g2']);
    expect(main.assessmentResults.map((a) => a.id).sort()).toEqual(['ar1', 'ar2']);
  });

  it('nothing either device did is lost, in both directions', () => {
    const local = fullProfileData({
      lessonProgress: [lessonProgress({ lessonId: 'from-local' })],
      earnedBadges: [
        {
          id: 'b1',
          profileId: 'p1',
          badgeId: 'local-badge',
          at: EARLIER.toISOString(),
          seen: false,
          createdAt: EARLIER.toISOString(),
          updatedAt: EARLIER.toISOString(),
        },
      ],
    });
    const incoming = fullProfileData({
      lessonProgress: [lessonProgress({ id: 'lp-i', lessonId: 'from-incoming' })],
      earnedBadges: [
        {
          id: 'b2',
          profileId: 'p1',
          badgeId: 'incoming-badge',
          at: EARLIER.toISOString(),
          seen: false,
          createdAt: EARLIER.toISOString(),
          updatedAt: EARLIER.toISOString(),
        },
      ],
    });
    const forward = mergeProfileData(local, incoming, NOW);
    expect(
      subjectOf(forward)
        .lessonProgress.map((p) => p.lessonId)
        .sort(),
    ).toEqual(['from-incoming', 'from-local']);
    expect(
      subjectOf(forward)
        .earnedBadges.map((b) => b.badgeId)
        .sort(),
    ).toEqual(['incoming-badge', 'local-badge']);

    const backward = mergeProfileData(incoming, local, NOW);
    expect(
      subjectOf(backward)
        .lessonProgress.map((p) => p.lessonId)
        .sort(),
    ).toEqual(['from-incoming', 'from-local']);
  });

  it('is idempotent: merging the same incoming file twice equals merging it once', () => {
    const local = fullProfileData({
      lessonProgress: [lessonProgress({ bestStars: { 'l1-01': 1 } })],
      attempts: [attempt({ id: 'a1' })],
      earnedBadges: [
        {
          id: 'b1',
          profileId: 'p1',
          badgeId: 'first-win',
          at: EARLIER.toISOString(),
          seen: false,
          createdAt: EARLIER.toISOString(),
          updatedAt: EARLIER.toISOString(),
        },
      ],
      sessionLogs: [sessionLog({ deviceId: 'device-a', minutes: 12 })],
      streak: {
        id: 's1',
        profileId: 'p1',
        current: 2,
        best: 2,
        lastDay: '2026-01-05',
        skipsUsedThisWeek: 0,
        createdAt: EARLIER.toISOString(),
        updatedAt: EARLIER.toISOString(),
      },
    });
    const incoming = fullProfileData({
      lessonProgress: [lessonProgress({ id: 'lp-i', bestStars: { 'l1-01': 3, 'l1-02': 2 } })],
      attempts: [attempt({ id: 'a2' })],
      earnedBadges: [
        {
          id: 'b2',
          profileId: 'p1',
          badgeId: 'first-win',
          at: LATER.toISOString(),
          seen: true,
          createdAt: LATER.toISOString(),
          updatedAt: LATER.toISOString(),
        },
      ],
      sessionLogs: [sessionLog({ id: 'log-b', deviceId: 'device-b', minutes: 20 })],
      streak: {
        id: 's2',
        profileId: 'p1',
        current: 5,
        best: 5,
        lastDay: '2026-01-09',
        skipsUsedThisWeek: 0,
        createdAt: LATER.toISOString(),
        updatedAt: LATER.toISOString(),
      },
    });

    const once = mergeProfileData(local, incoming, NOW);
    const twice = mergeProfileData(once, incoming, NOW);
    expect(twice).toEqual(once);
  });
});

/** Two-subject profile data (`a`, `b`) from per-subject overrides. */
function twoSubjectData(
  a: Partial<SubjectProfileData> = {},
  b: Partial<SubjectProfileData> = {},
): MergeableProfileData {
  return {
    settings: DEFAULT_PROFILE_SETTINGS,
    sessionLogs: [],
    subjects: {
      a: { ...emptySubjectProfileData(), ...a },
      b: { ...emptySubjectProfileData(), ...b },
    },
  };
}

function earnedBadge(overrides: Partial<EarnedBadge> = {}): EarnedBadge {
  return {
    id: 'b1',
    profileId: 'p1',
    badgeId: 'first-win',
    at: EARLIER.toISOString(),
    seen: false,
    createdAt: EARLIER.toISOString(),
    updatedAt: EARLIER.toISOString(),
    ...overrides,
  };
}

describe('mergeProfileData: placement decision', () => {
  const answer = (overrides: Partial<PlacementDecision> = {}): PlacementDecision => ({
    id: 'pd-1',
    profileId: 'p1',
    decision: 'declined',
    createdAt: EARLIER.toISOString(),
    updatedAt: EARLIER.toISOString(),
    ...overrides,
  });

  it('carries the decision of a subject, per subject, and keeps the key absent without one', () => {
    const local = twoSubjectData();
    const incoming = twoSubjectData({ placementDecision: answer({ decision: 'taken' }) });

    const merged = mergeProfileData(local, incoming, NOW);

    expect(subjectOf(merged, 'a').placementDecision?.decision).toBe('taken');
    expect('placementDecision' in subjectOf(merged, 'b')).toBe(false);
  });

  it('taken beats declined across devices, and merging twice changes nothing', () => {
    const local = twoSubjectData({ placementDecision: answer({ decision: 'declined' }) });
    const incoming = twoSubjectData({
      placementDecision: answer({ id: 'pd-2', decision: 'taken' }),
    });

    const once = mergeProfileData(local, incoming, NOW);
    expect(subjectOf(once, 'a').placementDecision?.decision).toBe('taken');
    expect(mergeProfileData(once, incoming, NOW)).toEqual(once);
    expect(subjectOf(mergeProfileData(incoming, local, NOW), 'a').placementDecision?.decision).toBe(
      'taken',
    );
  });

  it('rekeyProfileData points the decision at the target profile', () => {
    const data = twoSubjectData({ placementDecision: answer({ profileId: 'incoming-id' }) });

    const rekeyed = rekeyProfileData(data, 'local-id');

    expect(subjectOf(rekeyed, 'a').placementDecision?.profileId).toBe('local-id');
    expect(subjectOf(rekeyed, 'a').placementDecision?.id).toBe('pd-1');
    expect('placementDecision' in subjectOf(rekeyed, 'b')).toBe(false);
  });
});

describe('mergeProfileData: per-subject sections', () => {
  it('the same lesson id in two subjects stays separate (never merged across subjects)', () => {
    const local = twoSubjectData({
      lessonProgress: [lessonProgress({ lessonId: 'intro', bestStars: { e1: 1 } })],
    });
    const incoming = twoSubjectData(
      {},
      { lessonProgress: [lessonProgress({ id: 'lp-b', lessonId: 'intro', bestStars: { e1: 3 } })] },
    );
    const merged = mergeProfileData(local, incoming, NOW);
    expect(subjectOf(merged, 'a').lessonProgress).toEqual(local.subjects.a?.lessonProgress);
    expect(subjectOf(merged, 'a').lessonProgress[0]?.bestStars).toEqual({ e1: 1 });
    expect(subjectOf(merged, 'b').lessonProgress[0]?.bestStars).toEqual({ e1: 3 });
  });

  it('is the union of both sides’ subject ids; a side without one counts as empty', () => {
    const local: MergeableProfileData = {
      ...fullProfileData(),
      subjects: { a: { ...emptySubjectProfileData(), attempts: [attempt({ id: 'a-local' })] } },
    };
    const incoming: MergeableProfileData = {
      ...fullProfileData(),
      subjects: { b: { ...emptySubjectProfileData(), attempts: [attempt({ id: 'a-incoming' })] } },
    };
    const merged = mergeProfileData(local, incoming, NOW);
    expect(Object.keys(merged.subjects).sort()).toEqual(['a', 'b']);
    expect(subjectOf(merged, 'a').attempts.map((row) => row.id)).toEqual(['a-local']);
    expect(subjectOf(merged, 'b').attempts.map((row) => row.id)).toEqual(['a-incoming']);
  });

  it('caps (attempts 2000, game records 500, assessment results 500) apply per subject', () => {
    const at = (index: number): string => new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString();
    const attemptsFor = (prefix: string, count: number): Attempt[] =>
      Array.from({ length: count }, (_, index) =>
        attempt({ id: `${prefix}-${String(index)}`, createdAt: at(index), updatedAt: at(index) }),
      );
    const recordsFor = (prefix: string, count: number): GameRecord[] =>
      Array.from({ length: count }, (_, index) =>
        gameRecord({
          id: `${prefix}-${String(index)}`,
          createdAt: at(index),
          updatedAt: at(index),
        }),
      );
    const resultsFor = (prefix: string, count: number): AssessmentResult[] =>
      Array.from({ length: count }, (_, index) =>
        assessmentResult({
          id: `${prefix}-${String(index)}`,
          createdAt: at(index),
          updatedAt: at(index),
        }),
      );
    const local = twoSubjectData({
      attempts: attemptsFor('a', 1500),
      gameRecords: recordsFor('ga', 400),
      assessmentResults: resultsFor('ra', 400),
    });
    const incoming = twoSubjectData(
      {
        attempts: attemptsFor('a2', 1000).map((row) => ({ ...row, id: `x-${row.id}` })),
        gameRecords: recordsFor('ga2', 300),
        assessmentResults: resultsFor('ra2', 300),
      },
      { attempts: attemptsFor('b', 1800), gameRecords: recordsFor('gb', 450) },
    );

    const merged = mergeProfileData(local, incoming, NOW);

    expect(subjectOf(merged, 'a').attempts).toHaveLength(2000);
    expect(subjectOf(merged, 'a').gameRecords).toHaveLength(500);
    expect(subjectOf(merged, 'a').assessmentResults).toHaveLength(500);
    // b is under every cap by itself: untouched by a's overflow, though both subjects together exceed 2000.
    expect(subjectOf(merged, 'b').attempts).toHaveLength(1800);
    expect(subjectOf(merged, 'b').gameRecords).toHaveLength(450);
    expect(
      subjectOf(merged, 'a').attempts.length + subjectOf(merged, 'b').attempts.length,
    ).toBeGreaterThan(2000);
  });

  it('is idempotent across subjects', () => {
    const local = twoSubjectData({ lessonProgress: [lessonProgress({ bestStars: { e1: 1 } })] });
    const incoming = twoSubjectData(
      { lessonProgress: [lessonProgress({ id: 'lp-i', bestStars: { e1: 2 } })] },
      { earnedBadges: [earnedBadge({ id: 'b-in', badgeId: 'b-only' })] },
    );
    const once = mergeProfileData(local, incoming, NOW);
    expect(mergeProfileData(once, incoming, NOW)).toEqual(once);
  });
});

describe('profileStarsTotal / profileBadgeCount', () => {
  it('sum over every subject', () => {
    const data = twoSubjectData(
      {
        lessonProgress: [lessonProgress({ bestStars: { e1: 3, e2: 2 }, bossStars: 1 })],
        earnedBadges: [earnedBadge({ id: 'b1' })],
      },
      {
        lessonProgress: [lessonProgress({ id: 'lp-b', lessonId: 'other', bestStars: { e1: 1 } })],
        earnedBadges: [
          earnedBadge({ id: 'b2', badgeId: 'x' }),
          earnedBadge({ id: 'b3', badgeId: 'y' }),
        ],
      },
    );
    expect(profileStarsTotal(data)).toBe(3 + 2 + 1 + 1);
    expect(profileBadgeCount(data)).toBe(3);
  });

  it('are 0 with no subject sections', () => {
    const data = emptyProfileData(DEFAULT_PROFILE_SETTINGS);
    expect(profileStarsTotal(data)).toBe(0);
    expect(profileBadgeCount(data)).toBe(0);
  });
});

describe('rekeyProfileData', () => {
  it('re-keys every record’s profileId to the target, keeping record ids untouched', () => {
    const data = fullProfileData({
      lessonProgress: [lessonProgress({ id: 'lp1', profileId: 'incoming-id' })],
      attempts: [attempt({ id: 'a1', profileId: 'incoming-id' })],
      streak: {
        id: 's1',
        profileId: 'incoming-id',
        current: 1,
        best: 1,
        skipsUsedThisWeek: 0,
        createdAt: EARLIER.toISOString(),
        updatedAt: EARLIER.toISOString(),
      },
    });
    const rekeyed = rekeyProfileData(data, 'local-id');
    expect(subjectOf(rekeyed).lessonProgress[0]?.profileId).toBe('local-id');
    expect(subjectOf(rekeyed).lessonProgress[0]?.id).toBe('lp1');
    expect(subjectOf(rekeyed).attempts[0]?.profileId).toBe('local-id');
    expect(rekeyed.streak?.profileId).toBe('local-id');
  });
});

describe('rekeyProfileData: per-subject sections', () => {
  it('rewrites profileId inside every subject, shared logs and the streak too', () => {
    const data: MergeableProfileData = {
      ...twoSubjectData(
        {
          lessonProgress: [lessonProgress({ id: 'lp-a', profileId: 'incoming-id' })],
          unlocks: [
            {
              id: 'u1',
              profileId: 'incoming-id',
              targetType: 'lesson',
              targetId: 'l1',
              via: 'parent',
              createdAt: EARLIER.toISOString(),
              updatedAt: EARLIER.toISOString(),
            },
          ],
        },
        {
          earnedBadges: [earnedBadge({ id: 'b-b', profileId: 'incoming-id' })],
          gameRecords: [gameRecord({ id: 'g-b', profileId: 'incoming-id' })],
        },
      ),
      sessionLogs: [sessionLog({ profileId: 'incoming-id' })],
    };
    const rekeyed = rekeyProfileData(data, 'local-id');
    expect(subjectOf(rekeyed, 'a').lessonProgress[0]?.profileId).toBe('local-id');
    expect(subjectOf(rekeyed, 'a').unlocks[0]?.profileId).toBe('local-id');
    expect(subjectOf(rekeyed, 'b').earnedBadges[0]?.profileId).toBe('local-id');
    expect(subjectOf(rekeyed, 'b').gameRecords[0]?.profileId).toBe('local-id');
    expect(rekeyed.sessionLogs[0]?.profileId).toBe('local-id');
    // Record ids stay.
    expect(subjectOf(rekeyed, 'b').earnedBadges[0]?.id).toBe('b-b');
  });
});

describe('totalMinutesOverDays', () => {
  it('sums every device row across the window, days outside it excluded', () => {
    const data = fullProfileData({
      sessionLogs: [
        sessionLog({ deviceId: 'a', date: '2026-01-10', minutes: 10 }),
        sessionLog({ id: 'log-b', deviceId: 'b', date: '2026-01-09', minutes: 20 }),
        sessionLog({ id: 'log-c', deviceId: 'c', date: '2025-12-01', minutes: 99 }), // outside 7 days
      ],
    });
    expect(totalMinutesOverDays(data, NOW, 7)).toBe(30);
  });
});

describe('emptyProfileData', () => {
  it('has DEFAULT_PROFILE_SETTINGS, no session logs and no subject sections', () => {
    const data = emptyProfileData(DEFAULT_PROFILE_SETTINGS);
    expect(data.settings).toEqual(DEFAULT_PROFILE_SETTINGS);
    expect(data.sessionLogs).toEqual([]);
    expect(data.subjects).toEqual({});
    expect(data.streak).toBeUndefined();
  });
});

describe('emptySubjectProfileData', () => {
  it('has every list empty', () => {
    expect(emptySubjectProfileData()).toEqual({
      lessonProgress: [],
      attempts: [],
      miniGameProgress: [],
      conceptStats: [],
      gameRecords: [],
      earnedBadges: [],
      assessmentResults: [],
      unlocks: [],
    });
  });
});
