// Dev-only playground of logic's own kind UIs (`/#logic`): the `grid-fill` samples (a 4 x 4 sudoku for each focus, a 6 x 6, two pictures,
// and the guided try first), one at a time, in the real lesson step (instruction bubble, hints, Skip on a guided try), on a throw-away
// in-memory profile. No shipped lesson uses the kind yet, so the exercises are the fixture lesson's (`web/testing/grid-fixture.ts`).
// Needs the Logic subject to be the app's active one (the pack's `dev` screens are the active pack's), so open it once from the hub first.
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
import type { LogicExerciseDef } from '../../core/types.ts';
import { GRID_FILL_SAMPLES } from '../../kinds/grid-fill/samples.ts';
import { logicWeb } from '../logic-pack.ts';
import { GRID_CATALOG, GRID_GUIDED, GRID_LESSON, GRID_TEXTS } from '../testing/grid-fixture.ts';

interface Sample {
  readonly label: string;
  readonly def: LogicExerciseDef;
  readonly guided: boolean;
}

interface SampleGroup {
  readonly title: string;
  readonly samples: readonly Sample[];
}

const scored = (def: LogicExerciseDef): Sample => ({ label: def.id, def, guided: false });

const { lastCell, hiddenSingle, nakedSingle, all, six, castle, cat } = GRID_FILL_SAMPLES;

/** The fixture lesson's samples by what they draw: a 4 x 4 sudoku for each focus (the guided try leads), a 6 x 6, the pictures. */
const GROUPS: readonly SampleGroup[] = [
  {
    title: 'Sudoku 4 × 4',
    samples: [
      { label: `${GRID_GUIDED.id} (guided)`, def: GRID_GUIDED, guided: true },
      ...[lastCell, hiddenSingle, nakedSingle, all].map(scored),
    ],
  },
  { title: 'Sudoku 6 × 6', samples: [scored(six)] },
  { title: 'Picture cross', samples: [castle, cat].map(scored) },
];
const SAMPLES: readonly Sample[] = GROUPS.flatMap((group) => group.samples);

/** The logic pack over a content that has the fixture lesson (so saving a result finds its lesson). */
const playgroundWeb: SubjectWeb = {
  ...logicWeb,
  createServices: () => ({
    content: makeContentSource({
      lessons: [GRID_LESSON],
      minigames: [],
      catalog: GRID_CATALOG,
      badges: [],
    }),
    // A card subject has no runtime services: the pack's own (`{}`).
    subject: logicWeb.createServices().subject,
  }),
};

const PLAYGROUND_APP = {
  title: 'Logic playground',
  storagePrefix: 'logic-playground:',
  backupAppId: 'logic-playground',
  backupFilePrefix: 'logic-playground',
  parentCodeFilePrefix: 'logic-playground-code',
};

/** The fixture's texts into the loaded bundles (namespace by namespace, next to the real logic ones). */
function addFixtureTexts(): boolean {
  for (const [namespace, texts] of Object.entries(GRID_TEXTS)) {
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
        <div className="flex max-h-[760px] min-h-0 flex-1 flex-col">
          <ExerciseStep
            key={sample.def.id}
            lesson={GRID_LESSON}
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

export function LogicPlayground(): JSX.Element {
  const [selected, setSelected] = useState(0);
  const [textsReady] = useState(addFixtureTexts);
  const current = SAMPLES[selected];
  if (current === undefined || !textsReady) {
    return <p>The logic playground has no exercises.</p>;
  }
  return (
    <main className="flex h-dvh flex-col gap-3 bg-cream px-3 py-3 sm:px-8 sm:py-6">
      <span className="font-display text-lg text-ink">Logic playground (dev only)</span>
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
