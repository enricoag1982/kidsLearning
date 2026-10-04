import { planPlacement } from '@learn/platform-core';
import { setSubjectLocales } from '../../i18n.ts';
import type { AppGet, AppSet, AppState } from '../store.ts';
import { loadProfileData } from './profile.ts';

export interface SubjectsSlice {
  /** Subjects hub tile (`SubjectsScreen`): makes `id` the active subject (loading its pack on first use), remembers it as the
   * profile's last (`AppSettings.lastSubjectByProfile`), reloads the profile's data from that subject's stores and lands on
   * Home, with the hub below it; the placement offer on top on the first entry into a fresh subject (D10, once per app session). */
  readonly selectSubject: (id: string) => Promise<void>;
  /** Home's "Subjects" button: back to the hub. */
  readonly goToSubjects: () => void;
  /** The state-only part of {@link SubjectsSlice.selectSubject}, also used by profile select: activates `id`, swaps the texts,
   * installs its store slice on first use and clears everything bound to the previous subject (today's session, lesson step,
   * progress, journey, badges, the previous pack's `homeReset`). Stays on the current route and persists nothing. */
  readonly activateSubject: (id: string) => Promise<void>;
}

/** Subject-bound store state, cleared on a switch: `profile` data is reloaded from the new subject's stores afterwards. */
const SUBJECT_BOUND_RESET: Partial<AppState> = {
  todayPlan: null,
  todayActivityIndex: 0,
  todaySessionStartTotalStars: 0,
  todaySessionStartFriends: [],
  todaySessionStartRankId: null,
  stepIndex: 0,
  progress: [],
  miniGameProgress: [],
  gameRecords: [],
  conceptStats: [],
  journey: null,
  earnedBadges: [],
  activeCelebration: null,
};

/** Placement is due on a profile's first entry into a subject (multi-subject.md D10): the active subject has no lesson progress, no
 * assessment result and no unlock for `profileId`, offers a non-empty plan (the one `acceptPlacement` plays), and the pair was
 * not `offered` earlier in this app session. Reads the state after the profile data reload. */
async function shouldOfferPlacement(
  get: AppGet,
  profileId: string,
  offered: ReadonlySet<string>,
): Promise<boolean> {
  const { progress, journey, services, subjectId } = get();
  if (offered.has(`${profileId}:${subjectId}`)) return false;
  const { assessment } = services.deps;
  if (progress.length > 0 || journey === null || assessment === undefined) return false;
  const [results, unlocks] = await Promise.all([
    assessment.listAssessmentResults(profileId),
    assessment.listUnlocks(profileId),
  ]);
  if (results.length > 0 || unlocks.length > 0) return false;
  return planPlacement(journey.catalog, journey.lessons, services.deps.random).length > 0;
}

/** `initialSubjectId`'s slice is installed by `createAppStore`; every other subject's on its first activation. */
export function createSubjectsSlice(
  set: AppSet,
  get: AppGet,
  initialSubjectId: string,
): SubjectsSlice {
  const installed = new Set<string>([initialSubjectId]);
  /** `profileId:subjectId` pairs already offered placement in this app session (not persisted). */
  const offered = new Set<string>();

  async function activateSubject(id: string): Promise<void> {
    const { services, pack: previous } = get();
    const next = await services.app.activate(id);

    let slice: Partial<AppState> = {};
    if (!installed.has(id) && next.pack.createSlice) {
      slice = next.pack.createSlice(set, get);
      const present = get();
      for (const field of Object.keys(slice)) {
        if (field in present) {
          throw new Error(`subject slice field clash: ${field}`);
        }
      }
    }
    installed.add(id);

    setSubjectLocales(next.locales);
    set({
      ...slice,
      services: next,
      pack: next.pack,
      subjectId: id,
      ...SUBJECT_BOUND_RESET,
      ...(previous.homeReset ?? {}),
    });
  }

  return {
    activateSubject,

    async selectSubject(id) {
      await activateSubject(id);
      const { profile, services } = get();
      if (profile) {
        const settings = await services.deps.settings.get();
        if (settings.lastSubjectByProfile?.[profile.id] !== id) {
          await services.deps.settings.save({
            ...settings,
            lastSubjectByProfile: { ...settings.lastSubjectByProfile, [profile.id]: id },
          });
        }
        set(await loadProfileData(get, profile.id));
        if (
          services.app.subjects.length > 1 &&
          (await shouldOfferPlacement(get, profile.id, offered))
        ) {
          offered.add(`${profile.id}:${id}`);
          get().reset({ name: 'subjects' }, { name: 'home' }, { name: 'placement-offer' });
          return;
        }
      }
      get().reset({ name: 'subjects' }, { name: 'home' });
    },

    goToSubjects() {
      get().reset({ name: 'subjects' });
    },
  };
}
