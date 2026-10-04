// Dev-only playground of math's own kind UIs (`/#math`): the samples of each kind (`number-line`: an exact item on three line lengths,
// an estimate, a list of numbered ticks, a reason; `place-value`: 3 and 4 columns, a zero, a start, a reason, a 9; each with its guided
// try first), one at a time, in the real lesson step (instruction bubble, hints, Skip on a guided try), on a throw-away in-memory
// profile. No shipped lesson uses these kinds yet, so the exercises are the fixture lessons' (`web/testing/*`). Needs the Math subject
// to be the app's active one (the pack's `dev` screens are the active pack's), so open it once from the hub first.
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import i18next from 'i18next';
import type { TracksCatalog } from '@learn/platform-core';
import { makeContentSource } from '@learn/platform-core/testing';
import { createServices } from '@learn/platform-web/app/services.ts';
import { createAppStore, StoreProvider } from '@learn/platform-web/app/store.ts';
import { PackProvider } from '@learn/platform-web/app/subject.ts';
import type { SubjectWeb } from '@learn/platform-web/app/subject.ts';
import { createMemoryStorage } from '@learn/platform-web/testing/memory-storage.ts';
import { ExerciseStep } from '@learn/platform-web/ui/lesson/ExerciseStep.tsx';
import type { MathExerciseDef, MathLesson } from '../../core/types.ts';
import { mathWeb } from '../math-pack.ts';
import { LINE_LESSON, LINE_TEXTS } from '../testing/line-fixture.ts';
import { PLACE_VALUE_TEXTS, fixtureLesson } from '../testing/place-value-fixtures.ts';

interface Sample {
  readonly label: string;
  readonly def: MathExerciseDef;
  readonly guided: boolean;
  /** The lesson the step is drawn in. */
  readonly lesson: MathLesson;
}

interface SampleGroup {
  readonly title: string;
  readonly samples: readonly Sample[];
}

/** A fixture lesson's guided try, then its scored exercises. */
function samplesOf(lesson: MathLesson): readonly Sample[] {
  return [
    ...lesson.guided.map((def) => ({ label: `${def.id} (guided)`, def, guided: true, lesson })),
    ...lesson.exercises.map((def) => ({ label: def.id, def, guided: false, lesson })),
  ];
}

const GROUPS: readonly SampleGroup[] = [
  { title: 'Number line', samples: samplesOf(LINE_LESSON) },
  { title: 'Place value', samples: samplesOf(fixtureLesson) },
];

const SAMPLES: readonly Sample[] = GROUPS.flatMap((group) => group.samples);

/** One track with both fixture worlds, and the ranks the Home header needs. */
const PLAYGROUND_CATALOG: TracksCatalog = {
  tracks: [
    {
      id: 'numbers',
      kind: 'main',
      titleKey: 'journey:tracks.numbers',
      worlds: [
        {
          id: 'lines',
          track: 'numbers',
          order: 1,
          habitat: 'meadow',
          titleKey: 'journey:worlds.lines',
        },
        {
          id: 'adding',
          track: 'numbers',
          order: 2,
          habitat: 'meadow',
          titleKey: 'journey:worlds.adding',
        },
      ],
    },
  ],
  ranks: [
    { id: 'counter', after: 'start' },
    { id: 'adder', after: 'world:adding' },
  ],
};

/** The math pack over a content that has the fixture lessons (so saving a result finds its lesson). */
const playgroundWeb: SubjectWeb = {
  ...mathWeb,
  createServices: () => ({
    content: makeContentSource({
      lessons: [LINE_LESSON, fixtureLesson],
      minigames: [],
      catalog: PLAYGROUND_CATALOG,
      badges: [],
    }),
    // A card subject has no runtime services: the pack's own (typed per program, `{}` here and chess's fields in the app).
    subject: mathWeb.createServices().subject,
  }),
};

const PLAYGROUND_APP = {
  title: 'Math playground',
  storagePrefix: 'math-playground:',
  backupAppId: 'math-playground',
  backupFilePrefix: 'math-playground',
  parentCodeFilePrefix: 'math-playground-code',
};

/** The fixtures' texts into the loaded bundles (namespace by namespace, next to the real math ones). */
function addFixtureTexts(): boolean {
  for (const [namespace, texts] of Object.entries(LINE_TEXTS)) {
    i18next.addResourceBundle('en', namespace, texts, true, true);
  }
  i18next.addResourceBundle('en', 'lessons', PLACE_VALUE_TEXTS, true, true);
  return true;
}

/** One sample in the lesson step, `GameLayout`-wide like the real screen. */
function Preview({ sample }: { readonly sample: Sample }): JSX.Element {
  const [store] = useState(() =>
    createAppStore(createServices([playgroundWeb], PLAYGROUND_APP, createMemoryStorage())),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void store
      .getState()
      .init()
      .then(() => {
        setReady(true);
      });
  }, [store]);

  if (!ready) return <p className="text-muted">Loading…</p>;
  return (
    <PackProvider value={playgroundWeb}>
      <StoreProvider value={store}>
        <div className="flex max-h-[640px] min-h-0 flex-1 flex-col">
          <ExerciseStep
            key={sample.def.id}
            lesson={sample.lesson}
            exercise={sample.def}
            guided={sample.guided}
            nextStepIndex={1}
            {...(sample.guided ? { onSkip: () => undefined } : {})}
          />
        </div>
      </StoreProvider>
    </PackProvider>
  );
}

export function MathPlayground(): JSX.Element {
  const [selected, setSelected] = useState(0);
  const [textsReady] = useState(addFixtureTexts);
  const current = SAMPLES[selected];
  if (current === undefined || !textsReady) {
    return <p>The math playground has no exercises.</p>;
  }
  return (
    <main className="flex h-dvh flex-col gap-3 bg-cream px-3 py-3 sm:px-8 sm:py-6">
      <span className="font-display text-lg text-ink">Math playground (dev only)</span>
      {GROUPS.map((group) => (
        <div
          key={group.title}
          role="group"
          aria-label={group.title}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="w-28 text-sm font-bold text-muted">{group.title}:</span>
          {group.samples.map((sample) => (
            <button
              key={sample.def.id}
              type="button"
              onClick={() => {
                setSelected(SAMPLES.indexOf(sample));
              }}
              className={`rounded-full border-2 px-4 py-2 text-sm font-bold ${
                sample === current ? 'border-go bg-go text-white' : 'border-line bg-card text-ink'
              }`}
            >
              {sample.label}
            </button>
          ))}
        </div>
      ))}
      <Preview key={current.def.id} sample={current} />
    </main>
  );
}
