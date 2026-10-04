import { setSubjectLocales } from '../../i18n.ts';
import type { AppGet, AppSet, AppState } from '../store.ts';
import { loadProfileData } from './profile.ts';

export interface SubjectsSlice {
  /** Subjects hub tile (`SubjectsScreen`): makes `id` the active subject (loading its pack on first use), remembers it as the
   * profile's last (`AppSettings.lastSubjectByProfile`), reloads the profile's data from that subject's stores and lands on
   * Home, with the hub below it. */
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

/** `initialSubjectId`'s slice is installed by `createAppStore`; every other subject's on its first activation. */
export function createSubjectsSlice(
  set: AppSet,
  get: AppGet,
  initialSubjectId: string,
): SubjectsSlice {
  const installed = new Set<string>([initialSubjectId]);

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
      }
      get().reset({ name: 'subjects' }, { name: 'home' });
    },

    goToSubjects() {
      get().reset({ name: 'subjects' });
    },
  };
}
