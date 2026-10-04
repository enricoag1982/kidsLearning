import { describe, expect, it } from 'vitest';
import {
  makeAssessmentRepo,
  makeDeps,
  makeGameRecordRepo,
  makeProgressRepo,
  makeRewardsRepo,
} from '../testing/index.ts';
import type { SubjectDataRepositories } from './ports.ts';
import { allSubjectData } from './subject-data.ts';

describe('allSubjectData', () => {
  it('returns every registered subject, in registration order', () => {
    const entry = (): SubjectDataRepositories => ({
      progress: makeProgressRepo(),
      gameRecords: makeGameRecordRepo(),
      badges: makeRewardsRepo(),
    });
    const a = entry();
    const b = entry();
    expect(allSubjectData(makeDeps({ subjectData: { a, b } }))).toEqual([a, b]);
    expect(allSubjectData(makeDeps({ subjectData: { a, b } }))[0]).toBe(a);
  });

  it('single-subject deps: falls back to the deps own repositories', () => {
    const rewards = makeRewardsRepo();
    const assessment = makeAssessmentRepo();
    const deps = makeDeps({ rewards, assessment });
    const [only, ...rest] = allSubjectData(deps);
    expect(rest).toEqual([]);
    expect(only?.progress).toBe(deps.progress);
    expect(only?.gameRecords).toBe(deps.gameRecords);
    expect(only?.assessment).toBe(assessment);
    expect(only?.badges).toBe(rewards);
  });

  it('single-subject deps without rewards: badges is a no-op store', async () => {
    const [only] = allSubjectData(makeDeps({ rewards: undefined }));
    await only?.badges.deleteBadges('p1');
    expect(await only?.badges.listEarnedBadges('p1')).toEqual([]);
  });
});
