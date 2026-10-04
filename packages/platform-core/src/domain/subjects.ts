// Multi-subject checks and composition: subject ids, per-subject storage prefixes, and the single flat
// settings slot that every registered subject's slot folds into (`docs/multi-subject.md` D2, D6).
import type { AppConfig, SubjectSettingsSlot } from './subject.ts';

export const SUBJECT_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Throws on an empty list, an id not matching {@link SUBJECT_ID_PATTERN}, or a duplicate. */
export function assertSubjectIds(ids: readonly string[]): void {
  if (ids.length === 0) {
    throw new Error('at least one subject is required');
  }
  const seen = new Set<string>();
  for (const id of ids) {
    if (!SUBJECT_ID_PATTERN.test(id)) {
      throw new Error(`subject id "${id}" must match ${SUBJECT_ID_PATTERN.source}`);
    }
    if (seen.has(id)) {
      throw new Error(`duplicate subject id "${id}"`);
    }
    seen.add(id);
  }
}

/** `'kids:'` + `'chess'` → `'kids-chess:'`: a sibling of the shared prefix, never nested under it (`openLocalStore`
 * treats every key under its prefix as its own). Strips one trailing `:` from `storagePrefix`, then `${base}-${id}:`. */
export function defaultSubjectStoragePrefix(storagePrefix: string, subjectId: string): string {
  const base = storagePrefix.endsWith(':') ? storagePrefix.slice(0, -1) : storagePrefix;
  return `${base}-${subjectId}:`;
}

/** The app's own `subjectStoragePrefix` when set, else {@link defaultSubjectStoragePrefix}. */
export function subjectStoragePrefix(
  app: Pick<AppConfig, 'storagePrefix' | 'subjectStoragePrefix'>,
  subjectId: string,
): string {
  return (
    app.subjectStoragePrefix?.(subjectId) ??
    defaultSubjectStoragePrefix(app.storagePrefix, subjectId)
  );
}

/** Merges `parts` in order into one record; a key in two parts throws, naming both indexes and the key. */
function mergeUnique<T>(
  parts: readonly Readonly<Record<string, T>>[],
  what: string,
): Record<string, T> {
  const merged: Record<string, T> = {};
  const owner = new Map<string, number>();
  parts.forEach((part, index) => {
    for (const [key, value] of Object.entries(part)) {
      const first = owner.get(key);
      if (first !== undefined) {
        throw new Error(
          `${what} "${key}" is defined by slots ${String(first)} and ${String(index)}`,
        );
      }
      owner.set(key, index);
      merged[key] = value;
    }
  });
  return merged;
}

/** One slot for all registered subjects (settings stay flat, D6): `defaults` merged in list order (a key in two slots
 * throws, naming both indexes and the key); `retired` = union; `legacyExport` merged; `isValid` = every slot's
 * `isValid`; `loadBackupShape` = all shapes merged (a duplicate key throws). One slot is returned as is. */
export function composeSettingsSlots(slots: readonly SubjectSettingsSlot[]): SubjectSettingsSlot {
  const [first, ...rest] = slots;
  if (first === undefined) {
    throw new Error('at least one settings slot is required');
  }
  if (rest.length === 0) {
    return first;
  }
  const defaults = mergeUnique(
    slots.map((slot) => slot.defaults),
    'settings default',
  );
  const retired = [...new Set(slots.flatMap((slot) => slot.retired ?? []))];
  const legacyExport = Object.assign({}, ...slots.map((slot) => slot.legacyExport ?? {})) as Record<
    string,
    unknown
  >;
  return {
    defaults,
    ...(retired.length === 0 ? {} : { retired }),
    ...(Object.keys(legacyExport).length === 0 ? {} : { legacyExport }),
    isValid: (settings) => slots.every((slot) => slot.isValid(settings)),
    loadBackupShape: async () => {
      const shapes = await Promise.all(slots.map((slot) => slot.loadBackupShape()));
      return mergeUnique(shapes, 'backup settings field');
    },
  };
}
