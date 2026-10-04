import type { BadgeRepository, SubjectDataRepositories } from './ports.ts';
import type { AppDeps } from './use-cases.ts';

/** No-op badge store for single-subject deps without `rewards`. */
const NO_BADGES: BadgeRepository = {
  addEarnedBadge: () => Promise.resolve(),
  listEarnedBadges: () => Promise.resolve([]),
  saveEarnedBadge: () => Promise.resolve(),
  deleteBadges: () => Promise.resolve(),
};

/** Subject id of single-subject deps without `AppDeps.subjectId` (test fixtures, apps predating subjects). */
export const DEFAULT_SUBJECT_ID = 'main';

/** Every registered subject's own repositories by subject id: `deps.subjectData`, or (single-subject deps) this deps' own
 * ones under `deps.subjectId` (default {@link DEFAULT_SUBJECT_ID}). */
export function subjectDataById(deps: AppDeps): Readonly<Record<string, SubjectDataRepositories>> {
  if (deps.subjectData !== undefined) {
    return deps.subjectData;
  }
  return {
    [deps.subjectId ?? DEFAULT_SUBJECT_ID]: {
      progress: deps.progress,
      gameRecords: deps.gameRecords,
      assessment: deps.assessment,
      badges: deps.rewards ?? NO_BADGES,
    },
  };
}

/** {@link subjectDataById}'s repositories, in registration order. */
export function allSubjectData(deps: AppDeps): readonly SubjectDataRepositories[] {
  return Object.values(subjectDataById(deps));
}
