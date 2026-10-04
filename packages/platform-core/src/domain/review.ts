import type { Lesson } from './lesson.ts';
import type { StoredRecord } from './profile.ts';
import type { Random } from './random.ts';
import { shuffle } from './random.ts';
import type { ExerciseDefBase, MiniGameBase } from './subject.ts';

/** Review box 1–5 (Leitner), or absent = the concept has not entered review yet. */
export type ReviewBox = 1 | 2 | 3 | 4 | 5;

/** `recent`: up to the last 10 first-try results, newest last. `box`/`dueAt` unset until `enterReview`;
 * `lastExerciseId` lets the picker avoid a repeat. */
export interface ConceptStats extends StoredRecord {
  readonly profileId: string;
  readonly conceptId: string;
  readonly recent: readonly boolean[];
  readonly box?: ReviewBox;
  readonly dueAt?: string;
  readonly lastExerciseId?: string;
}

export function newConceptStats(
  id: string,
  profileId: string,
  conceptId: string,
  now: Date,
): ConceptStats {
  const nowIso = now.toISOString();
  return { id, profileId, conceptId, recent: [], createdAt: nowIso, updatedAt: nowIso };
}

const RECENT_MAX = 10;

export function appendResult(stats: ConceptStats, correct: boolean, now: Date): ConceptStats {
  const recent = [...stats.recent, correct].slice(-RECENT_MAX);
  return { ...stats, recent, updatedAt: now.toISOString() };
}

/** First-try correct ratio over `recent`; `0` with no results yet. */
export function accuracy(stats: ConceptStats): number {
  if (stats.recent.length === 0) {
    return 0;
  }
  return stats.recent.filter(Boolean).length / stats.recent.length;
}

/** Weak concept: at least 3 results and accuracy below 60%. */
export function isWeak(stats: ConceptStats): boolean {
  return stats.recent.length >= 3 && accuracy(stats) < 0.6;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Puts `stats` into review: box 1, due in 1 day, or due immediately (`immediate`) when the kid
 * needed the easier variant / answered wrong. Already in review only moves when `immediate`. */
export function enterReview(stats: ConceptStats, now: Date, immediate: boolean): ConceptStats {
  if (stats.box !== undefined && !immediate) {
    return stats;
  }
  const dueAt = (immediate ? now : addDays(now, 1)).toISOString();
  return { ...stats, box: 1, dueAt, updatedAt: now.toISOString() };
}

/** Review interval by box: 1→1 day … 5→16 days. */
const REVIEW_INTERVAL_DAYS: Readonly<Record<ReviewBox, number>> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
};

/** Applies a warm-up/practice review task's result: correct (first try, no hint) moves the box up
 * (max 5); anything else resets it to box 1. Always reschedules `dueAt`. */
export function applyReviewResult(
  stats: ConceptStats,
  correct: boolean,
  exerciseId: string,
  now: Date,
): ConceptStats {
  const currentBox = stats.box ?? 1;
  const box = (correct ? Math.min(5, currentBox + 1) : 1) as ReviewBox;
  const dueAt = addDays(now, REVIEW_INTERVAL_DAYS[box]).toISOString();
  return { ...stats, box, dueAt, lastExerciseId: exerciseId, updatedAt: now.toISOString() };
}

export function isDue(stats: ConceptStats, now: Date): boolean {
  return stats.box !== undefined && stats.dueAt !== undefined && stats.dueAt <= now.toISOString();
}

export interface ConceptPoolEntry<E extends ExerciseDefBase = ExerciseDefBase> {
  readonly lessonId: string;
  readonly exercise: E;
}

/** `conceptId`'s scored exercise pool: every scored exercise of every lesson whose exercise concept
 * matches, across the whole curriculum — not only the lesson that first taught it. */
export function conceptPool<E extends ExerciseDefBase>(
  lessons: readonly Lesson<E>[],
  conceptId: string,
): readonly ConceptPoolEntry<E>[] {
  return lessons.flatMap((lesson) =>
    lesson.exercises
      .filter((exercise) => exercise.concept === conceptId)
      .map((exercise) => ({ lessonId: lesson.id, exercise })),
  );
}

/** Concepts a warm-up or Practice task can be drawn for: those with at least one scored exercise in `lessons`.
 * Stored stats of a concept a later version removed fall outside it (retired content, G8). */
export function warmUpConcepts(lessons: readonly Lesson[]): ReadonlySet<string> {
  const concepts = new Set<string>();
  for (const lesson of lessons) {
    for (const exercise of lesson.exercises) {
      concepts.add(exercise.concept);
    }
  }
  return concepts;
}

/** `stats` that are due now and whose concept the content still has: the count Home and Practice offer as a warm-up. */
export function dueWarmUpStats(
  stats: readonly ConceptStats[],
  lessons: readonly Lesson[],
  now: Date,
): readonly ConceptStats[] {
  const concepts = warmUpConcepts(lessons);
  return stats.filter((entry) => concepts.has(entry.conceptId) && isDue(entry, now));
}

function roundsOf(game: object): readonly unknown[] {
  const rounds = (game as { readonly rounds?: unknown }).rounds;
  return Array.isArray(rounds) ? (rounds as readonly unknown[]) : [];
}

function conceptOf(value: unknown): string | undefined {
  const concept = (value as { readonly concept?: unknown } | null)?.concept;
  return typeof concept === 'string' ? concept : undefined;
}

/** Every concept id the content mentions: each lesson's own concept and each of its exercises' (guided, scored, variants),
 * each mini-game's concept and, for a round-based mini-game, each round's. What the parent report lists accuracy for. */
export function contentConceptIds(
  lessons: readonly Lesson[],
  minigames: readonly MiniGameBase[] = [],
): ReadonlySet<string> {
  const concepts = new Set<string>();
  for (const lesson of lessons) {
    concepts.add(lesson.concept);
    for (const exercise of [...lesson.guided, ...lesson.exercises, ...(lesson.variants ?? [])]) {
      concepts.add(exercise.concept);
    }
  }
  for (const game of minigames) {
    concepts.add(game.concept);
    for (const round of roundsOf(game)) {
      const concept = conceptOf(round);
      if (concept !== undefined) concepts.add(concept);
    }
  }
  return concepts;
}

export interface ConceptTask<E extends ExerciseDefBase = ExerciseDefBase> {
  readonly conceptId: string;
  readonly lessonId: string;
  readonly exercise: E;
}

/** Warm-up is always exactly this many tasks (or fewer when review has fewer concepts to draw on). */
const WARM_UP_SIZE = 3;

function pickOne<E extends ExerciseDefBase>(
  entries: readonly ConceptPoolEntry<E>[],
  avoidExerciseId: string | undefined,
  random: Random,
): ConceptPoolEntry<E> | undefined {
  const filtered =
    entries.length > 1 ? entries.filter((entry) => entry.exercise.id !== avoidExerciseId) : entries;
  const pool = filtered.length > 0 ? filtered : entries;
  if (pool.length === 0) {
    return undefined;
  }
  const index = Math.min(pool.length - 1, Math.floor(random.next() * pool.length));
  return pool[index];
}

/** Picks the warm-up's tasks: concepts in review due oldest-`dueAt`-first, max 1 per concept, up to
 * {@link WARM_UP_SIZE}; short of that, fills with the weakest concepts still in review. Only concepts with a non-empty
 * `pool` entry are considered: a concept the content no longer has (retired) can neither take a slot nor starve the rest. */
export function pickWarmUp<E extends ExerciseDefBase>(
  stats: readonly ConceptStats[],
  pool: ReadonlyMap<string, readonly ConceptPoolEntry<E>[]>,
  now: Date,
  random: Random,
): readonly ConceptTask<E>[] {
  const inReview = stats.filter(
    (entry) => entry.box !== undefined && (pool.get(entry.conceptId)?.length ?? 0) > 0,
  );
  if (inReview.length === 0) {
    return [];
  }

  const nowIso = now.toISOString();
  const due = inReview
    .filter((entry) => entry.dueAt !== undefined && entry.dueAt <= nowIso)
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));

  const chosen = due.slice(0, WARM_UP_SIZE);
  if (chosen.length < WARM_UP_SIZE) {
    const chosenIds = new Set(chosen.map((entry) => entry.conceptId));
    const rest = inReview
      .filter((entry) => !chosenIds.has(entry.conceptId))
      .sort((a, b) => {
        const accuracyDiff = accuracy(a) - accuracy(b);
        return accuracyDiff !== 0 ? accuracyDiff : (a.dueAt ?? '').localeCompare(b.dueAt ?? '');
      });
    for (const entry of rest) {
      if (chosen.length >= WARM_UP_SIZE) break;
      chosen.push(entry);
    }
  }

  const tasks: ConceptTask<E>[] = [];
  for (const entry of chosen) {
    const picked = pickOne(pool.get(entry.conceptId) ?? [], entry.lastExerciseId, random);
    if (picked !== undefined) {
      tasks.push({
        conceptId: entry.conceptId,
        lessonId: picked.lessonId,
        exercise: picked.exercise,
      });
    }
  }
  return tasks;
}

/** Picks `count` practice tasks for one concept, shuffled by `random`; cycles the pool again when
 * `count` exceeds it. Avoids opening on `lastExerciseId` by moving it to the end. */
export function pickPracticeTasks<E extends ExerciseDefBase>(
  conceptId: string,
  pool: readonly ConceptPoolEntry<E>[],
  lastExerciseId: string | undefined,
  count: number,
  random: Random,
): readonly ConceptTask<E>[] {
  if (pool.length === 0) {
    return [];
  }
  const shuffled = shuffle(pool, random);
  const ordered =
    lastExerciseId !== undefined && shuffled.length > 1
      ? [
          ...shuffled.filter((entry) => entry.exercise.id !== lastExerciseId),
          ...shuffled.filter((entry) => entry.exercise.id === lastExerciseId),
        ]
      : shuffled;

  const tasks: ConceptTask<E>[] = [];
  for (let i = 0; i < count; i += 1) {
    const entry = ordered[i % ordered.length];
    if (entry !== undefined) {
      tasks.push({ conceptId, lessonId: entry.lessonId, exercise: entry.exercise });
    }
  }
  return tasks;
}
