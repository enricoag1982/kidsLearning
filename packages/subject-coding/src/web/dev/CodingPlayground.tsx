// Dev-only playground of the coding kind UIs (`/#coding`): every exercise of the fixture lesson and boss, one at a time, in the real
// lesson step (instruction bubble, hints, Skip on a guided try), on a throw-away in-memory profile. Needs the Coding subject to be
// the app's active one (the pack's `dev` screens are the active pack's), so open it once from the hub first.
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import type { Lesson } from '@learn/platform-core';
import { createServices } from '@learn/platform-web/app/services.ts';
import { createAppStore, StoreProvider } from '@learn/platform-web/app/store.ts';
import { PackProvider } from '@learn/platform-web/app/subject.ts';
import { createMemoryStorage } from '@learn/platform-web/testing/memory-storage.ts';
import { ExerciseStep } from '@learn/platform-web/ui/lesson/ExerciseStep.tsx';
import type { CodingExerciseDef } from '../../core/types.ts';
import { codingWeb } from '../coding-pack.ts';

interface Sample {
  readonly label: string;
  readonly def: CodingExerciseDef;
  readonly guided: boolean;
}

const content = codingWeb.createServices().content;
const lesson = content.lesson('seq-arrows') as Lesson<CodingExerciseDef> | undefined;
const boss = content.minigame('fixture-boss') as unknown as
  { readonly rounds: readonly CodingExerciseDef[] } | undefined;

/** The guided tries, the scored exercises and the boss rounds of the fixture world. */
const SAMPLES: readonly Sample[] = [
  ...(lesson?.guided ?? []).map((def) => ({ label: `${def.id} (guided)`, def, guided: true })),
  ...(lesson?.exercises ?? []).map((def) => ({ label: def.id, def, guided: false })),
  ...(boss?.rounds ?? []).map((def) => ({ label: `${def.id} (boss)`, def, guided: false })),
];

const PLAYGROUND_APP = {
  title: 'Coding playground',
  storagePrefix: 'coding-playground:',
  backupAppId: 'coding-playground',
  backupFilePrefix: 'coding-playground',
  parentCodeFilePrefix: 'coding-playground-code',
};

/** One sample in the lesson step, `GameLayout`-wide like the real screen. */
function Preview({
  sample,
  lessonDef,
}: {
  readonly sample: Sample;
  readonly lessonDef: Lesson;
}): JSX.Element {
  const [store] = useState(() =>
    createAppStore(createServices([codingWeb], PLAYGROUND_APP, createMemoryStorage())),
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
    <PackProvider value={codingWeb}>
      <StoreProvider value={store}>
        <div className="flex min-h-0 max-h-[640px] flex-1 flex-col">
          <ExerciseStep
            key={sample.def.id}
            lesson={lessonDef}
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

export function CodingPlayground(): JSX.Element {
  const [selected, setSelected] = useState(0);
  const current = SAMPLES[selected];
  if (lesson === undefined || current === undefined) {
    return <p>The coding fixture has no exercises.</p>;
  }
  return (
    <main className="flex h-dvh flex-col gap-3 bg-cream px-3 py-3 sm:px-8 sm:py-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-lg text-ink">Coding playground (dev only):</span>
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
      <Preview key={current.def.id} sample={current} lessonDef={lesson} />
    </main>
  );
}
