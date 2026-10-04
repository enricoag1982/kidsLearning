import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { recordExerciseResult } from '@learn/platform-core';
import { startExercise } from '@learn/subject-chess';
import {
  fixtureContentSource,
  fixtureExercise,
  fixtureLesson,
} from '@learn/subject-chess/web/testing/fixtures.ts';
import { seedReturningProfile } from '@learn/subject-chess/web/testing/app-test-helpers.ts';
import { renderApp } from '@learn/subject-chess/web/testing/render-app.tsx';
import { renderWithStore } from '@learn/platform-web/testing/render-with-store.tsx';
import { createTestServices } from '@learn/subject-chess/web/testing/test-services.ts';
import { PracticeScreen } from '@learn/platform-web/ui/PracticeScreen.tsx';

describe('PracticeScreen', () => {
  it('nothing complete yet: no topics, warm-up disabled ("All done for today!")', async () => {
    const lesson = fixtureLesson();
    const services = createTestServices(fixtureContentSource(lesson));
    await renderWithStore(<PracticeScreen />, services);

    await screen.findByText('Finish a lesson to see it here!');
    expect(screen.getByText('All done for today!')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Daily warm-up/ }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('a complete lesson shows as a topic, with accuracy dots from its attempts', async () => {
    const lesson = fixtureLesson();
    const services = createTestServices(fixtureContentSource(lesson));
    const { store } = await renderWithStore(<PracticeScreen />, services);
    const profileId = store.getState().profile?.id ?? '';
    const exercise = lesson.exercises[0] ?? fixtureExercise();

    await recordExerciseResult(services.deps, {
      profileId,
      lesson,
      state: { ...startExercise(exercise), solved: true, moves: 1 },
      scored: true,
      durationMs: 500,
      nextStep: 1,
    });
    await act(async () => {
      await store.getState().refreshProgress();
    });

    await screen.findByRole('button', { name: /title, 1 of 1 correct/ });
  });

  it('a weak concept (accuracy < 60%, ≥3 results) gets the "Needs practice" tag', async () => {
    const lesson = fixtureLesson();
    const services = createTestServices(fixtureContentSource(lesson));
    const { store } = await renderWithStore(<PracticeScreen />, services);
    const profileId = store.getState().profile?.id ?? '';

    await services.deps.progress.saveLesson({
      id: 'lp1',
      profileId,
      lessonId: lesson.id,
      bestStars: { [lesson.exercises[0]?.id ?? '']: 1 },
      bossStars: 0,
      resumeStep: 5,
      completedAt: services.deps.clock.now().toISOString(),
      createdAt: services.deps.clock.now().toISOString(),
      updatedAt: services.deps.clock.now().toISOString(),
    });
    await services.deps.progress.saveConceptStats({
      id: 'cs1',
      profileId,
      conceptId: lesson.concept,
      recent: [false, false, true],
      createdAt: services.deps.clock.now().toISOString(),
      updatedAt: services.deps.clock.now().toISOString(),
    });
    await act(async () => {
      await store.getState().refreshProgress();
    });

    await screen.findByRole('button', { name: /Needs practice/ });
  });

  it('due warm-up card starts a review task; solving it updates the due count back to "All done for today!"', async () => {
    const lesson = fixtureLesson();
    const services = createTestServices(fixtureContentSource(lesson));
    const profile = await seedReturningProfile(services, 'Mia');

    await services.deps.progress.saveConceptStats({
      id: 'cs1',
      profileId: profile.id,
      conceptId: lesson.concept,
      recent: [],
      box: 1,
      dueAt: services.deps.clock.now().toISOString(),
      createdAt: services.deps.clock.now().toISOString(),
      updatedAt: services.deps.clock.now().toISOString(),
    });

    await renderApp(services, { at: 'home' });

    fireEvent.click(await screen.findByRole('button', { name: 'Practice' }));
    await screen.findByText('1 due today');

    fireEvent.click(screen.getByRole('button', { name: /Daily warm-up/ }));

    await screen.findByText('Warm-up 1/1');
    fireEvent.click(await screen.findByRole('button', { name: /^a1,/ }));
    fireEvent.click(screen.getByRole('button', { name: /^h1,/ }));

    await screen.findByText('Amazing!');
    fireEvent.click(await screen.findByRole('button', { name: /^Next/ }));

    // Back on Practice: the review moved the concept's box up, no longer due today.
    await screen.findByText('All done for today!');
    expect(screen.queryByText('1 due today')).toBeNull();

    const stats = await services.deps.progress.getConceptStats(profile.id, lesson.concept);
    expect(stats?.box).toBe(2);
  });
  describe('retired content (G8): stored stats of a concept the content no longer has', () => {
    const dueStats = (
      services: ReturnType<typeof createTestServices>,
      profileId: string,
      id: string,
      conceptId: string,
    ) => {
      const now = services.deps.clock.now().toISOString();
      return {
        id,
        profileId,
        conceptId,
        recent: [false, false, false],
        box: 1 as const,
        dueAt: '2020-01-01T00:00:00.000Z',
        createdAt: now,
        updatedAt: now,
      };
    };

    it('a due retired concept alone offers no warm-up: "All done for today!", button disabled', async () => {
      const lesson = fixtureLesson();
      const services = createTestServices(fixtureContentSource(lesson));
      const { store } = await renderWithStore(<PracticeScreen />, services);
      const profileId = store.getState().profile?.id ?? '';

      await services.deps.progress.saveConceptStats(
        dueStats(services, profileId, 'cs-old', 'retired-concept'),
      );
      await act(async () => {
        await store.getState().refreshProgress();
      });

      await screen.findByText('All done for today!');
      expect(screen.queryByText(/due today/)).toBeNull();
      expect(screen.getByRole('button', { name: /Daily warm-up/ }).hasAttribute('disabled')).toBe(
        true,
      );
    });

    it('counts only the concepts the content has: 1 live + 2 retired due = "1 due today"; topics unaffected', async () => {
      const lesson = fixtureLesson();
      const services = createTestServices(fixtureContentSource(lesson));
      const { store } = await renderWithStore(<PracticeScreen />, services);
      const profileId = store.getState().profile?.id ?? '';
      const now = services.deps.clock.now().toISOString();

      await services.deps.progress.saveLesson({
        id: 'lp1',
        profileId,
        lessonId: lesson.id,
        bestStars: { [lesson.exercises[0]?.id ?? '']: 3 },
        bossStars: 0,
        resumeStep: 5,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      // The retired lesson's own progress stays stored, too.
      await services.deps.progress.saveLesson({
        id: 'lp-old',
        profileId,
        lessonId: 'retired-lesson',
        bestStars: { 'retired-01': 3 },
        bossStars: 0,
        resumeStep: 5,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      for (const [id, conceptId] of [
        ['cs-live', lesson.concept],
        ['cs-old-1', 'retired-concept-1'],
        ['cs-old-2', 'retired-concept-2'],
      ] as const) {
        await services.deps.progress.saveConceptStats(dueStats(services, profileId, id, conceptId));
      }
      await act(async () => {
        await store.getState().refreshProgress();
      });

      await screen.findByText('1 due today');
      // One topic: the live lesson's; the retired concepts and lesson list nothing.
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
  });
});
