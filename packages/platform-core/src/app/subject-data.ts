import type { BadgeRepository, SubjectDataRepositories } from './ports.ts';
import type { AppDeps } from './use-cases.ts';

/** No-op badge store for single-subject deps without `rewards`. */
const NO_BADGES: BadgeRepository = {
  addEarnedBadge: () => Promise.resolve(),
  listEarnedBadges: () => Promise.resolve([]),
  saveEarnedBadge: () => Promise.resolve(),
  deleteBadges: () => Promise.resolve(),
};

/** Every registered subject's own repositories: `deps.subjectData`, or (single-subject deps) this deps' own ones. */
export function allSubjectData(deps: AppDeps): readonly SubjectDataRepositories[] {
  if (deps.subjectData !== undefined) {
    return Object.values(deps.subjectData);
  }
  return [
    {
      progress: deps.progress,
      gameRecords: deps.gameRecords,
      assessment: deps.assessment,
      badges: deps.rewards ?? NO_BADGES,
    },
  ];
}
