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
];
