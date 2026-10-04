// Dev-only playground of math's own kind UIs (`/#math`): the `number-line` samples (an exact item on three line lengths, an estimate, a
// list of numbered ticks, a reason), one at a time, in the real lesson step (instruction bubble, hints, Skip on a guided try), on a
// throw-away in-memory profile. No shipped lesson uses the kind yet, so the exercises are `LINE_LESSON`'s. Needs the Math subject to be
// the app's active one (the pack's `dev` screens are the active pack's), so open it once from the hub first.
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import i18next from 'i18next';
import { makeContentSource } from '@learn/platform-core/testing';
import { createServices } from '@learn/platform-web/app/services.ts';
import { createAppStore, StoreProvider } from '@learn/platform-web/app/store.ts';
import { PackProvider } from '@learn/platform-web/app/subject.ts';
import type { SubjectWeb } from '@learn/platform-web/app/subject.ts';
import { createMemoryStorage } from '@learn/platform-web/testing/memory-storage.ts';
import { ExerciseStep } from '@learn/platform-web/ui/lesson/ExerciseStep.tsx';
import type { MathExerciseDef } from '../../core/types.ts';
import { mathWeb } from '../math-pack.ts';
import { LINE_CATALOG, LINE_LESSON, LINE_TEXTS } from '../testing/line-fixture.ts';

interface Sample {
  readonly label: string;
  readonly def: MathExerciseDef;
  readonly guided: boolean;
}

const SAMPLES: readonly Sample[] = [
  ...LINE_LESSON.guided.map((def) => ({ label: `${def.id} (guided)`, def, guided: true })),
  ...LINE_LESSON.exercises.map((def) => ({ label: def.id, def, guided: false })),
];

/** The math pack over a content that has the fixture lesson (so saving a result finds its lesson). */
const playgroundWeb: SubjectWeb = {
  ...mathWeb,
  createServices: () => ({
    content: makeContentSource({
      lessons: [LINE_LESSON],
      minigames: [],
      catalog: LINE_CATALOG,
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

/** The fixture's texts into the loaded bundles (namespace by namespace, next to the real math ones). */
function addFixtureTexts(): boolean {
  for (const [namespace, texts] of Object.entries(LINE_TEXTS)) {
    i18next.addResourceBundle('en', namespace, texts, true, true);
  }
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
            lesson={LINE_LESSON}
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-lg text-ink">Math playground (dev only):</span>
        {SAMPLES.map(({ label }, index) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setSelected(index);
            }}
            className={`rounded-full border-2 px-4 py-2 text-sm font-bold ${
              index === selected ? 'border-go bg-go text-white' : 'border-line bg-card text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <Preview key={current.def.id} sample={current} />
    </main>
  );
}
