import type {
  AssessmentRepository,
  AssessmentResult,
  PlacementDecision,
  Unlock,
} from '@learn/platform-core';
import type { CappedList, KeyedCollection } from './collections.ts';
import { cappedList, keyedCollection, shapeGuard } from './collections.ts';
import type { LocalStore } from './local-store.ts';
import { STORAGE_KEYS } from './storage-keys.ts';

/** Oldest results are dropped once storage holds more than this many (parent report only needs recent ones). */
export const MAX_ASSESSMENT_RESULTS = 500;

const isAssessmentResultShape = shapeGuard<AssessmentResult>({
  string: ['id', 'profileId', 'kind'],
  number: ['correct', 'total'],
  boolean: ['passed'],
});

const isUnlockShape = shapeGuard<Unlock>({
  string: ['id', 'profileId', 'targetType', 'targetId', 'via'],
});

const isPlacementDecisionShape = shapeGuard<PlacementDecision>({
  string: ['id', 'profileId', 'decision'],
});

export class LocalStorageAssessmentRepository implements AssessmentRepository {
  private readonly results: CappedList<AssessmentResult>;
  private readonly unlocks: CappedList<Unlock>;
  private readonly placementDecisions: KeyedCollection<PlacementDecision>;

  constructor(store: LocalStore) {
    this.results = cappedList(
      store,
      STORAGE_KEYS.assessmentResults,
      MAX_ASSESSMENT_RESULTS,
      isAssessmentResultShape,
    );
    this.unlocks = cappedList(store, STORAGE_KEYS.unlocks, undefined, isUnlockShape);
    this.placementDecisions = keyedCollection(
      store,
      STORAGE_KEYS.placementDecisions,
      (decision) => decision.profileId,
      isPlacementDecisionShape,
    );
  }

  addAssessmentResult(result: AssessmentResult): Promise<void> {
    return this.results.add(result);
  }

  listAssessmentResults(profileId: string): Promise<AssessmentResult[]> {
    return this.results.list((result) => result.profileId === profileId);
  }

  addUnlock(unlock: Unlock): Promise<void> {
    return this.unlocks.add(unlock);
  }

  listUnlocks(profileId: string): Promise<Unlock[]> {
    return this.unlocks.list((unlock) => unlock.profileId === profileId);
  }

  getPlacementDecision(profileId: string): Promise<PlacementDecision | undefined> {
    return this.placementDecisions.get(profileId);
  }

  savePlacementDecision(decision: PlacementDecision): Promise<void> {
    return this.placementDecisions.put(decision);
  }

  deleteProfileData(profileId: string): Promise<void> {
    return Promise.all([
      this.results.removeWhere((result) => result.profileId === profileId),
      this.unlocks.removeWhere((unlock) => unlock.profileId === profileId),
      this.placementDecisions.remove(profileId),
    ]).then(() => undefined);
  }
}
