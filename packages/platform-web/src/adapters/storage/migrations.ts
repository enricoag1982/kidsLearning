import type { Migration } from './local-store.ts';

/** Every schema migration this build knows, applied in order by `openLocalStore`. None need
 * existing data transformed — a profile with none yet reads back an empty list/undefined. */
export const MIGRATIONS: readonly Migration[] = [
  {
    to: 2,
    migrate: () => {
      // No-op: nothing to transform.
    },
  },
  {
    to: 3,
    migrate: () => {
      // No-op: nothing to transform.
    },
  },
  {
    to: 4,
    migrate: () => {
      // No-op: nothing to transform.
    },
  },
  {
    to: 5,
    migrate: () => {
      // No-op: nothing to transform.
    },
  },
  {
    to: 6,
    migrate: () => {
      // 6: backup format v6 (per-subject sections, m11.3); storage layout unchanged.
    },
  },
  {
    to: 7,
    migrate: () => {
      // 7: `placement-decisions` (m15.4, one record per profile in each subject's own store); a profile without one reads as
      // "not answered yet", nothing to transform.
    },
  },
];
