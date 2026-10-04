import { describe, expect, it } from 'vitest';
import {
  makeAssessmentRepo,
  makeDeps,
  makeGameRecordRepo,
  makeProgressRepo,
  makeRewardsRepo,
} from '../testing/index.ts';
import type { SubjectDataRepositories } from './ports.ts';
import { allSubjectData, DEFAULT_SUBJECT_ID, subjectDataById } from './subject-data.ts';

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

describe('subjectDataById', () => {
  it('returns deps.subjectData as is', () => {
    const entry = (): SubjectDataRepositories => ({
      progress: makeProgressRepo(),
      gameRecords: makeGameRecordRepo(),
      badges: makeRewardsRepo(),
    });
    const subjectData = { a: entry(), b: entry() };
    expect(subjectDataById(makeDeps({ subjectData }))).toBe(subjectData);
  });

  it('single-subject deps: the deps own repositories under DEFAULT_SUBJECT_ID', () => {
    const deps = makeDeps({ rewards: makeRewardsRepo() });
    const byId = subjectDataById(deps);
    expect(DEFAULT_SUBJECT_ID).toBe('main');
    expect(Object.keys(byId)).toEqual(['main']);
    expect(byId.main?.progress).toBe(deps.progress);
    expect(byId.main?.badges).toBe(deps.rewards);
  });

  it('single-subject deps with subjectId: that id', () => {
    const deps = makeDeps({ subjectId: 'chess' });
    expect(Object.keys(subjectDataById(deps))).toEqual(['chess']);
  });
});
