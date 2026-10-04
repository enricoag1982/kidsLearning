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
import type { SubjectServices, SubjectWeb } from './subject.ts';

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

export interface Services {
  /** The active subject's deps: the first pack until `m11.4` adds switching. */
  readonly deps: AppDeps;
  readonly narrator: Narrator;
  /** The active subject's services: the first pack until `m11.4` adds switching. */
  readonly subject: SubjectServices;
  /** Scoped `AppDeps` per subject id: shared repositories (profiles, settings, …) are the same instances in every one, the
   * subject's own repositories and content differ. `deps` is one of these. */
  readonly subjectDeps: Readonly<Record<string, AppDeps>>;
  /** Each subject's own runtime services per subject id; `subject` is one of these. */
  readonly subjectServices: Readonly<Record<string, SubjectServices>>;
  /** Gates `narrator` on the active profile's "voice" setting (app-structure.md §11); set at every profile select. */
  setVoiceEnabled(enabled: boolean): void;
  /** Active nickname, stripped from narrated text before the audio lookup (`docs/voice.md`); set with `setVoiceEnabled`. */
  setNickname(nickname: string | null): void;
  /** Parent "Test voice" (`ChildSettings.tsx`): speaks `text` through the audio narrator, ignoring the voice setting, and reports if generated audio played. */
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

/** Composition root: wires one scoped `AppDeps` per subject (`packs`) to the web adapters. Profiles, settings, parent code, the
 * streak and session logs live in the shared store (`appConfig.storagePrefix`); each subject's progress, attempts, game records,
 * badges and assessment live in its own (`subjectStoragePrefix`). */
export function createServices(
  packs: readonly SubjectWeb[],
  appConfig: Omit<AppConfig, 'version'>,
  storage: Storage = window.localStorage,
): Services {
  const ids = packs.map((pack) => pack.core.id);
  assertSubjectIds(ids);
  const prefixes = checkedSubjectPrefixes(appConfig, ids);
  const settingsSlot = composeSettingsSlots(packs.map((pack) => pack.core.settings));
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
    passwordFile: createDownloadPasswordFileWriter(appConfig.parentCodeFilePrefix),
    settings: new LocalStorageSettingsRepository(sharedStore),
    random: createMathRandom(),
    backupFileWriter: createLazyBackupFileWriter(),
    backupImporter: createLazyBackupImporter(sharedStore, subjectStores),
    storageSchemaVersion: SCHEMA_VERSION,
    app: { ...appConfig, version: __APP_VERSION__ },
  };

  const subjectData: Record<string, SubjectDataRepositories> = {};
  const subjectDeps: Record<string, AppDeps> = {};
  const subjectServices: Record<string, SubjectServices> = {};
  for (const [index, pack] of packs.entries()) {
    const id = pack.core.id;
    const prefix = prefixes[index];
    if (prefix === undefined) {
      throw new Error(`no storage prefix for subject "${id}"`);
    }
    const subjectStore =
      prefix === appConfig.storagePrefix
        ? sharedStore
        : openLocalStore(storage, { migrations: MIGRATIONS, keyPrefix: prefix });
    subjectStores[id] = subjectStore;
    const { content, subject } = pack.createServices();
    const progress = new LocalStorageProgressRepository(subjectStore);
    const gameRecords = new LocalStorageGameRecordRepository(subjectStore);
    const assessment = new LocalStorageAssessmentRepository(subjectStore);
    const rewards = new LocalStorageRewardsRepository(subjectStore, sharedStore);
    subjectData[id] = { progress, gameRecords, assessment, badges: rewards };
    subjectServices[id] = subject;
    subjectDeps[id] = {
      ...shared,
      progress,
      gameRecords,
      rewards,
      assessment,
      content,
      subject: createSubjectRuntime(pack.core, settingsSlot),
      subjectData,
      subjectId: id,
    };
  }

  const [first] = ids;
  const deps = first === undefined ? undefined : subjectDeps[first];
  const activeSubject = first === undefined ? undefined : subjectServices[first];
  if (deps === undefined || activeSubject === undefined) {
    throw new Error('no subject registered');
  }

  // Pre-generated Kokoro audio per narrated text (docs/voice.md), Web Speech as the fallback for
  // any text without generated audio — `createGatedNarrator` wraps the combined pair.
  const audioNarrator = createAudioNarrator({
    baseUrl: `${import.meta.env.BASE_URL}audio/en/`,
    storagePrefix: appConfig.storagePrefix,
    fallback: createWebSpeechNarrator(),
  });
  const narrator = createGatedNarrator(audioNarrator);

  return {
    deps,
    narrator,
    subject: activeSubject,
    subjectDeps,
    subjectServices,
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
  };
}
