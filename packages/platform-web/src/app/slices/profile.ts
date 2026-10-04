import {
  composeDefaultSettings,
  createProfile,
  getProfileSettings,
  listProfiles,
  loadGameRecords,
  loadJourney,
  loadMiniGameProgress,
  loadProgress,
  selectProfile,
  type ConceptStats,
  type GameRecord,
  type Journey,
  type LessonProgress,
  type MiniGameProgress,
  type Profile,
  type ProfileSettings,
} from '@learn/platform-core';
import { requestPersistentStorageIfNeeded } from '../../adapters/persistent-storage.ts';
import type { AppGet, AppSet } from '../store.ts';
import { loadRewards, type RewardsSlice } from './rewards.ts';

export interface ProfileSlice {
  readonly profiles: readonly Profile[];
  readonly profile: Profile | null;
  /** `profile`'s own parent-set settings (app-structure.md §11); the composed defaults outside a
   * selected profile. Voice is applied at load time, not read from here. */
  readonly activeProfileSettings: ProfileSettings;
  readonly progress: readonly LessonProgress[];
  readonly miniGameProgress: readonly MiniGameProgress[];
  readonly gameRecords: readonly GameRecord[];
  /** Concept mastery + review state; Home's "Start today" and Practice's due count / weak tags read it. */
  readonly conceptStats: readonly ConceptStats[];
  readonly journey: Journey | null;

  /** First run: after "Saved", to the new-player wizard, Home (one existing profile; the subjects hub with several subjects) or the picker (more than one). */
  readonly finishFirstRun: () => Promise<void>;
  /** Creates the profile and selects it: back to the parent area when opened from there, else Home with the placement offer
   * on top; with several subjects the subjects hub instead (no offer there, multi-subject.md D10). */
  readonly finishNewPlayer: (nickname: string, avatar: string) => Promise<void>;
  /** Selects the profile and lands on Home, or on the subjects hub with several subjects (the profile's last subject active). */
  readonly selectProfileAndHome: (profileId: string) => Promise<void>;
  readonly refreshProfiles: () => Promise<void>;
  /** Re-reads lesson + mini-game progress and the derived Journey, e.g. after a lesson or mini-game session. */
  readonly refreshProgress: () => Promise<void>;
}

/** Loaded together by `activateProfile` / `refreshProgress`; the same fields `ProfileSlice` and `RewardsSlice` declare. */
type ProfileData = Pick<
  ProfileSlice,
  'progress' | 'miniGameProgress' | 'gameRecords' | 'conceptStats' | 'journey'
> &
  Pick<RewardsSlice, 'earnedBadges' | 'streak'>;

/** Progress, journey and rewards loaded in parallel; shared by `activateProfile` and `refreshProgress`. */
export async function loadProfileData(get: AppGet, profileId: string): Promise<ProfileData> {
  const { services } = get();
  const [progress, miniGameProgress, gameRecords, conceptStats, journey, rewards] =
    await Promise.all([
      loadProgress(services.deps, profileId),
      loadMiniGameProgress(services.deps, profileId),
      loadGameRecords(services.deps, profileId),
      services.deps.progress.listConceptStats(profileId),
      loadJourney(services.deps, profileId),
      loadRewards(get, profileId),
    ]);
  return {
    progress,
    miniGameProgress,
    gameRecords,
    conceptStats,
    journey,
    earnedBadges: rewards.earnedBadges,
    streak: rewards.streak ?? null,
  };
}

/** Makes `profile` the one playing: settings side effects, progress load, celebration reset.
 * Shared by `finishFirstRun`, `finishNewPlayer`, `selectProfileAndHome`. */
async function activateProfile(
  set: AppSet,
  get: AppGet,
  profile: Profile,
  settings: ProfileSettings,
): Promise<void> {
  const { services } = get();
  const data = await loadProfileData(get, profile.id);
  services.setVoiceEnabled(settings.voice);
  services.setNickname(profile.nickname);
  set({
    profile,
    activeProfileSettings: settings,
    ...data,
    activeCelebration: null,
    celebrationsShownThisSession: 0,
  });
}

/** Re-reads and stores the profiles list; shared by `refreshProfiles` and other call sites. */
export async function reloadProfiles(set: AppSet, get: AppGet): Promise<readonly Profile[]> {
  const profiles = await listProfiles(get().services.deps);
  set({ profiles });
  return profiles;
}

/** Several subjects: the profile's last one becomes the active subject (the hub highlights it, a later Home shows it) when it
 * differs from the active one; a profile without one keeps the active subject. */
async function activateLastSubject(get: AppGet, profileId: string): Promise<void> {
  const { services, subjectId } = get();
  const { lastSubjectByProfile } = await services.deps.settings.get();
  const last = lastSubjectByProfile?.[profileId];
  if (
    last !== undefined &&
    last !== subjectId &&
    services.app.subjects.some((entry) => entry.manifest.id === last)
  ) {
    await get().activateSubject(last);
  }
}

/** Selects `profile` and lands on Home; with several subjects on the subjects hub instead. */
async function selectAndGoHome(set: AppSet, get: AppGet, profile: Profile): Promise<void> {
  const { services } = get();
  await selectProfile(services.deps, profile.id);
  const settings = await getProfileSettings(services.deps, profile.id);
  const hub = services.app.subjects.length > 1;
  if (hub) await activateLastSubject(get, profile.id);
  await activateProfile(set, get, profile, settings);
  get().reset(hub ? { name: 'subjects' } : { name: 'home' });
}

/** `defaultSettings` is the composed default (`composeDefaultSettings`) of the settings slot, the same for every subject. */
export function createProfileSlice(
  set: AppSet,
  get: AppGet,
  defaultSettings: ProfileSettings,
): ProfileSlice {
  return {
    profiles: [],
    profile: null,
    activeProfileSettings: defaultSettings,
    progress: [],
    miniGameProgress: [],
    gameRecords: [],
    conceptStats: [],
    journey: null,

    async finishFirstRun() {
      const profiles = await reloadProfiles(set, get);
      if (profiles.length === 0) {
        void get().navigate({ name: 'new-player' });
        return;
      }
      const [only] = profiles;
      if (profiles.length === 1 && only) {
        // A single existing profile with no parent lock yet skips creation, straight to Home.
        await selectAndGoHome(set, get, only);
        return;
      }
      await get().goToPicker();
    },

    async finishNewPlayer(nickname: string, avatar: string) {
      const { services } = get();
      const profile = await createProfile(services.deps, nickname, avatar);
      // Storage eviction (non-functional.md §1): a no-op after the first profile on this device.
      await requestPersistentStorageIfNeeded(services.deps);
      // Return target (picker vs parent area) is read off the stack: 'new-player' sits on top.
      const { stack } = get();
      const returnsToParent = stack[stack.length - 2]?.name === 'parent';
      if (returnsToParent) {
        await reloadProfiles(set, get);
        void get().back();
        return;
      }
      await selectProfile(services.deps, profile.id);
      // A brand-new profile has no stored settings yet; defaults apply as-is (voice on).
      await activateProfile(
        set,
        get,
        profile,
        composeDefaultSettings(get().services.deps.subject.settings),
      );
      await reloadProfiles(set, get);
      if (services.app.subjects.length > 1) {
        // The subjects hub next; the placement offer follows the first entry into a subject (multi-subject.md D10).
        get().reset({ name: 'subjects' });
        return;
      }
      // domain-model.md §3.2: placement offered once, right after creating a new player.
      get().reset({ name: 'home' }, { name: 'placement-offer' });
    },

    async selectProfileAndHome(profileId: string) {
      const profile = await get().services.deps.profiles.get(profileId);
      if (!profile) return;
      await selectAndGoHome(set, get, profile);
    },

    async refreshProfiles() {
      await reloadProfiles(set, get);
    },

    async refreshProgress() {
      const { profile } = get();
      if (!profile) return;
      set(await loadProfileData(get, profile.id));
    },
  };
}
