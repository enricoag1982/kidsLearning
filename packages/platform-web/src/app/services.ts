import type {
  AppConfig,
  AppDeps,
  BackupFileWriter,
  BackupImporter,
  Narrator,
  SubjectDataRepositories,
} from '@learn/platform-core';
import {
  assertSubjectIds,
  composeSettingsSlots,
  createSubjectRuntime,
  subjectStoragePrefix,
} from '@learn/platform-core';
import { createCryptoIds } from '../adapters/ids.ts';
import { createSystemClock } from '../adapters/clock.ts';
import { createDownloadPasswordFileWriter } from '../adapters/download-password-file-writer.ts';
import type { AudioNarratorOutcome } from '../adapters/narration/audio-narrator.ts';
import { createAudioNarrator } from '../adapters/narration/audio-narrator.ts';
import { createGatedNarrator } from '../adapters/narration/gated-narrator.ts';
import { createWebSpeechNarrator } from '../adapters/narration/web-speech-narrator.ts';
import { createMathRandom } from '../adapters/random.ts';
import { LocalStorageAssessmentRepository } from '../adapters/storage/local-assessment-repository.ts';
import { LocalStorageGameRecordRepository } from '../adapters/storage/local-game-record-repository.ts';
import { LocalStorageParentLockRepository } from '../adapters/storage/local-parent-lock-repository.ts';
import { LocalStorageProfileRepository } from '../adapters/storage/local-profile-repository.ts';
import { LocalStorageProgressRepository } from '../adapters/storage/local-progress-repository.ts';
import { LocalStorageRewardsRepository } from '../adapters/storage/local-rewards-repository.ts';
import { LocalStorageSettingsRepository } from '../adapters/storage/local-settings-repository.ts';
import type { LocalStore } from '../adapters/storage/local-store.ts';
import { openLocalStore, SCHEMA_VERSION } from '../adapters/storage/local-store.ts';
import { MIGRATIONS } from '../adapters/storage/migrations.ts';
import type {
  HomeTileColors,
  LoadedSubject,
  SubjectEntry,
  SubjectServices,
  SubjectWeb,
} from './subject.ts';

/** `AppDeps.backupFileWriter`/`backupImporter`: read only from the lazy-loaded Parent area, so
 * their implementations are fetched on first use, not shipped in the initial bundle. */
function createLazyBackupFileWriter(): BackupFileWriter {
  return {
    async write(filename, contents) {
      const { createDownloadBackupFileWriter } =
        await import('../adapters/download-backup-file-writer.ts');
      return createDownloadBackupFileWriter().write(filename, contents);
    },
  };
}

function createLazyBackupImporter(
  sharedStore: LocalStore,
  subjectStores: Readonly<Record<string, LocalStore>>,
): BackupImporter {
  return {
    async writeMerged(file, options) {
      const { LocalStorageBackupImporter } =
        await import('../adapters/storage/local-backup-importer.ts');
      return new LocalStorageBackupImporter(sharedStore, subjectStores).writeMerged(file, options);
    },
  };
}

/** App-wide services: built once, no subject active (`docs/multi-subject.md` D4, D7). Shared repositories live in the
 * scoped deps of an activated subject; there is no shared-only `AppDeps` view. */
export interface AppServices {
  readonly subjects: readonly SubjectEntry[];
  /** Every registered subject's own repositories by subject id, usable before any pack loads. */
  readonly subjectData: Readonly<Record<string, SubjectDataRepositories>>;
  readonly narrator: Narrator;
  /** Gates `narrator` on the active profile's "voice" setting (app-structure.md §11); set at every profile select. */
  setVoiceEnabled(enabled: boolean): void;
  /** Active nickname, stripped from narrated text before the audio lookup (`docs/voice.md`); set with `setVoiceEnabled`. */
  setNickname(nickname: string | null): void;
  /** Parent "Test voice" (`ChildSettings.tsx`): speaks `text` through the audio narrator, ignoring the voice setting, and reports if generated audio played. */
  testVoice(text: string): Promise<AudioNarratorOutcome>;
  /** Loads `id`'s pack once (cached promise), builds its scoped deps once, returns `Services` with it active. */
  activate(id: string): Promise<Services>;
  /** Same, for an already-loaded subject (tests, single-subject sync path); caches like `activate`. */
  activateLoaded(id: string, loaded: LoadedSubject): Services;
  /** `lastSubjectByProfile[lastProfileId]` when that subject is registered, else the first entry's id. */
  initialSubjectId(): Promise<string>;
}

/** The app's services with one subject active. Several `Services` objects of one subject may exist, all sharing the
 * same `deps` and `subject` instances. */
export interface Services {
  readonly app: AppServices;
  readonly subjectId: string;
  readonly pack: SubjectWeb;
  readonly locales: LoadedSubject['locales'];
  /** The active subject's scoped deps: shared repositories (profiles, settings, …) are the same instances in every
   * subject's, the subject's own repositories and content differ. */
  readonly deps: AppDeps;
  readonly narrator: Narrator;
  /** The active subject's own runtime services. */
  readonly subject: SubjectServices;
  /** Same as `app.setVoiceEnabled`. */
  setVoiceEnabled(enabled: boolean): void;
  /** Same as `app.setNickname`. */
  setNickname(nickname: string | null): void;
  /** Same as `app.testVoice`. */
  testVoice(text: string): Promise<AudioNarratorOutcome>;
}

/** Each subject's own key prefix (`subjectStoragePrefix`), checked before any store is opened. The shared prefix is allowed for
 * a single-subject app keeping one store. Throws on prefixes that would alias: two subjects on one store, or one prefix nested
 * inside another (`openLocalStore` would read the other's keys as unversioned data). */
function checkedSubjectPrefixes(
  appConfig: Omit<AppConfig, 'version'>,
  ids: readonly string[],
): readonly string[] {
  const shared = appConfig.storagePrefix;
  const own: string[] = [];
  return ids.map((id) => {
    const prefix = subjectStoragePrefix(appConfig, id);
    if (prefix === shared) {
      if (ids.length > 1) {
        throw new Error(
          `subject "${id}": prefix "${prefix}" is the shared one, two subjects would share one store`,
        );
      }
      return prefix;
    }
    if (prefix.startsWith(shared) || shared.startsWith(prefix)) {
      throw new Error(
        `subject "${id}": prefix "${prefix}" is nested with the shared prefix "${shared}"`,
      );
    }
    const clash = own.find(
      (other) => other === prefix || other.startsWith(prefix) || prefix.startsWith(other),
    );
    if (clash !== undefined) {
      throw new Error(
        clash === prefix
          ? `subject "${id}": prefix "${prefix}" is already used by another subject, two subjects would share one store`
          : `subject "${id}": prefix "${prefix}" is nested with the prefix "${clash}" of another subject`,
      );
    }
    own.push(prefix);
    return prefix;
  });
}

/** One subject's own repositories, built with the app and shared by every `Services` of that subject. */
interface SubjectRepositories {
  readonly progress: LocalStorageProgressRepository;
  readonly gameRecords: LocalStorageGameRecordRepository;
  readonly assessment: LocalStorageAssessmentRepository;
  readonly rewards: LocalStorageRewardsRepository;
}

/** Composition root: wires the shared services and every subject's repositories to the web adapters; a subject's pack is
 * loaded and its scoped `AppDeps` built on `activate`. Profiles, settings, parent code, the streak and session logs live in
 * the shared store (`appConfig.storagePrefix`); each subject's progress, attempts, game records, badges and assessment live
 * in its own (`subjectStoragePrefix`). */
export function createAppServices(
  subjects: readonly SubjectEntry[],
  appConfig: Omit<AppConfig, 'version'>,
  storage: Storage = window.localStorage,
): AppServices {
  const ids = subjects.map((entry) => entry.manifest.id);
  assertSubjectIds(ids);
  const prefixes = checkedSubjectPrefixes(appConfig, ids);
  const settingsSlot = composeSettingsSlots(subjects.map((entry) => entry.manifest.settings));
  const sharedStore = openLocalStore(storage, {
    migrations: MIGRATIONS,
    keyPrefix: appConfig.storagePrefix,
  });

  // Filled in the subject loop below; the lazy importer reads it only at write time, after every subject has registered.
  const subjectStores: Record<string, LocalStore> = {};

  const shared = {
    profiles: new LocalStorageProfileRepository(sharedStore),
    clock: createSystemClock(),
    ids: createCryptoIds(),
    parentLock: new LocalStorageParentLockRepository(sharedStore),
    passwordFile: createDownloadPasswordFileWriter(appConfig.parentCodeFilePrefix, appConfig.title),
    settings: new LocalStorageSettingsRepository(sharedStore),
    random: createMathRandom(),
    backupFileWriter: createLazyBackupFileWriter(),
    backupImporter: createLazyBackupImporter(sharedStore, subjectStores),
    storageSchemaVersion: SCHEMA_VERSION,
    app: { ...appConfig, version: __APP_VERSION__ },
  };

  const subjectData: Record<string, SubjectDataRepositories> = {};
  const repositories: Record<string, SubjectRepositories> = {};
  for (const [index, entry] of subjects.entries()) {
    const id = entry.manifest.id;
    const prefix = prefixes[index];
    if (prefix === undefined) {
      throw new Error(`no storage prefix for subject "${id}"`);
    }
    const subjectStore =
      prefix === appConfig.storagePrefix
        ? sharedStore
        : openLocalStore(storage, { migrations: MIGRATIONS, keyPrefix: prefix });
    subjectStores[id] = subjectStore;
    const progress = new LocalStorageProgressRepository(subjectStore);
    const gameRecords = new LocalStorageGameRecordRepository(subjectStore);
    const assessment = new LocalStorageAssessmentRepository(subjectStore);
    const rewards = new LocalStorageRewardsRepository(subjectStore, sharedStore);
    subjectData[id] = { progress, gameRecords, assessment, badges: rewards };
    repositories[id] = { progress, gameRecords, assessment, rewards };
  }

  // Pre-generated Kokoro audio per narrated text (docs/voice.md), Web Speech as the fallback for
  // any text without generated audio — `createGatedNarrator` wraps the combined pair.
  const audioNarrator = createAudioNarrator({
    baseUrl: `${import.meta.env.BASE_URL}audio/en/`,
    storagePrefix: appConfig.storagePrefix,
    fallback: createWebSpeechNarrator(),
  });
  const narrator = createGatedNarrator(audioNarrator);

  const [firstId] = ids;
  if (firstId === undefined) {
    throw new Error('no subject registered');
  }
  const entryById = new Map(subjects.map((entry) => [entry.manifest.id, entry] as const));
  const loads = new Map<string, Promise<LoadedSubject>>();
  const activated = new Map<string, Services>();

  function activateLoaded(id: string, loaded: LoadedSubject): Services {
    const repos = repositories[id];
    if (repos === undefined) {
      throw new Error(`unknown subject "${id}"`);
    }
    if (loaded.pack.core.id !== id) {
      throw new Error(`subject "${id}": the loaded pack has core id "${loaded.pack.core.id}"`);
    }
    const cached = activated.get(id);
    if (cached !== undefined) {
      return cached;
    }
    const { pack, locales } = loaded;
    const { content, subject } = pack.createServices();
    const deps: AppDeps = {
      ...shared,
      ...repos,
      content,
      subject: createSubjectRuntime(pack.core, settingsSlot),
      subjectData,
      subjectId: id,
    };
    const services: Services = {
      app,
      subjectId: id,
      pack,
      locales,
      deps,
      narrator,
      subject,
      setVoiceEnabled: (enabled) => {
        app.setVoiceEnabled(enabled);
      },
      setNickname: (nickname) => {
        app.setNickname(nickname);
      },
      testVoice: (text) => app.testVoice(text),
    };
    activated.set(id, services);
    return services;
  }

  const app: AppServices = {
    subjects,
    subjectData,
    narrator,
    setVoiceEnabled: (enabled) => {
      narrator.setEnabled(enabled);
    },
    setNickname: (nickname) => {
      audioNarrator.setNickname(nickname);
    },
    testVoice: async (text) => {
      await audioNarrator.speak(text);
      // `doSpeak` (`audio-narrator.ts`) always sets this before returning; the fallback here is
      // only for type safety (`lastOutcome()` is `| null` before any call ever completes).
      return audioNarrator.lastOutcome() ?? { kind: 'fallback', reason: 'no-audio-context' };
    },
    async activate(id) {
      const entry = entryById.get(id);
      if (entry === undefined) {
        throw new Error(`unknown subject "${id}"`);
      }
      let loading = loads.get(id);
      if (loading === undefined) {
        const started = entry.load();
        loading = started;
        loads.set(id, started);
        // A failed load is not cached: the next `activate` tries again.
        started.catch(() => {
          loads.delete(id);
        });
      }
      return activateLoaded(id, await loading);
    },
    activateLoaded,
    async initialSubjectId() {
      const { lastProfileId, lastSubjectByProfile } = await shared.settings.get();
      const last = lastProfileId === null ? undefined : lastSubjectByProfile?.[lastProfileId];
      return last !== undefined && entryById.has(last) ? last : firstId;
    },
  };
  return app;
}

/** The neutral hub colours of {@link createServices}' wrapped packs (never shown: those apps have one subject). */
const NEUTRAL_TILE_COLORS: HomeTileColors = { bg: '#F1E9D8', fg: '#4B3A63', ledge: '#352945' };

/** Sync convenience (tests, single-subject callers): entries from already-loaded packs (no locales), the first pack active. */
export function createServices(
  packs: readonly SubjectWeb[],
  appConfig: Omit<AppConfig, 'version'>,
  storage: Storage = window.localStorage,
): Services {
  const entries: SubjectEntry[] = packs.map((pack) => ({
    manifest: {
      id: pack.core.id,
      settings: pack.core.settings,
      names: { en: pack.core.id },
      icon: '',
      colors: NEUTRAL_TILE_COLORS,
    },
    load: () => Promise.resolve({ pack, locales: {} }),
  }));
  const app = createAppServices(entries, appConfig, storage);
  const [first] = packs;
  if (first === undefined) {
    throw new Error('no subject registered');
  }
  return app.activateLoaded(first.core.id, { pack: first, locales: {} });
}
