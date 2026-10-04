import { createContext, useContext } from 'react';
import { create, type StoreApi } from 'zustand';
import { composeDefaultSettings } from '@learn/platform-core';
import type { Route, RouteName } from './routes.ts';
import type { Services } from './services.ts';
import type { SubjectState, SubjectWeb } from './subject.ts';
import { createLearnSlice, type LearnSlice } from './slices/learn.ts';
import { createNavSlice, type NavSlice } from './slices/nav.ts';
import { createProfileSlice, type ProfileSlice } from './slices/profile.ts';
import { createRewardsSlice, type RewardsSlice } from './slices/rewards.ts';
import { createSubjectsSlice, type SubjectsSlice } from './slices/subjects.ts';
import { createTimeSlice, type TimeSlice } from './slices/time.ts';
import { createTodaySlice, type TodaySlice } from './slices/today.ts';

/** Test-only stack override (see `slices/nav.ts`), re-exported so ui tests need one import path. */
export { setRoute } from './slices/nav.ts';

/** Which top-level screen is showing. `loading` is the instant before `init()` resolves. */
export type Screen = RouteName;

/** Composed from `app/slices/*.ts` plus the subjects' own slices (`pack.createSlice`, chess: `PlaySlice`, via `SubjectState`):
 * the active one's from the start, every other one's from its first activation. */
export interface AppState
  extends
    NavSlice,
    ProfileSlice,
    RewardsSlice,
    TimeSlice,
    LearnSlice,
    TodaySlice,
    SubjectsSlice,
    SubjectState {
  /** The active subject's services (`services.app` stays the same across subjects). */
  readonly services: Services;
  /** The active subject's id: `services.subjectId`. */
  readonly subjectId: string;
  /** The active subject's pack: `services.pack`. */
  readonly pack: SubjectWeb;
}

/** Bound `set` / `get` a slice receives, typed against the full {@link AppState} so any action can read or write any field. */
export type AppSet = StoreApi<AppState>['setState'];
export type AppGet = StoreApi<AppState>['getState'];

export type SliceCreator<T> = (set: AppSet, get: AppGet) => T;

/** Pops back (optionally to a named, gated frame) and refreshes progress: the exit shape of several slices. */
export function backAndRefresh(
  get: AppGet,
  to?: RouteName,
  opts?: { readonly gate?: boolean },
): () => void {
  return () => {
    void get().back(to, opts);
    void get().refreshProgress();
  };
}

export type AppStore = ReturnType<typeof createAppStore>;

export function createAppStore(services: Services) {
  const { pack } = services;
  return create<AppState>((set, get) => ({
    services,
    subjectId: services.subjectId,
    pack,
    ...createNavSlice(set, get),
    ...createProfileSlice(set, get, composeDefaultSettings(services.deps.subject.settings)),
    ...createRewardsSlice(set, get),
    ...createTimeSlice(set, get),
    ...createLearnSlice(set, get),
    ...createTodaySlice(set, get),
    ...createSubjectsSlice(set, get, services.subjectId),
    // Without `createSlice` the empty `SubjectState` base is all there is, so `{}` is a real `SubjectState`; TS cannot see that
    // across the optional call.
    ...(pack.createSlice ? pack.createSlice(set, get) : ({} as SubjectState)),
  }));
}

const StoreContext = createContext<AppStore | null>(null);

export const StoreProvider = StoreContext.Provider;

export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useAppStore must be used within a StoreProvider');
  }
  return store(selector);
}

export function useServices(): Services {
  return useAppStore((state) => state.services);
}

/** The current route (the stack's top), narrowed to `name`'s own param shape; `null` when a
 * different route shows. */
export function useRoute<N extends RouteName>(name: N): Extract<Route, { name: N }> | null {
  const route = useAppStore((state) => state.stack[state.stack.length - 1]);
  return route?.name === name ? (route as Extract<Route, { name: N }>) : null;
}
