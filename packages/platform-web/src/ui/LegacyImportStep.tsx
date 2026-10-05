import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  findLegacyImportOffer,
  importLegacyStore,
  storeLegacyDecision,
} from '../adapters/legacy-import.ts';
import type { LegacyStore } from '../adapters/legacy-import.ts';
import { useAppStore, useServices } from '../app/store.ts';
import { NarratedBubble } from './ds/NarratedBubble.tsx';
import { Screen } from './ds/Screen.tsx';
import { tapClass } from './ds/tap.ts';

/** First run, after the parent code (docs/multi-subject.md F1): looks for an older app's progress on this device and, when
 * there is some and the question was never answered, asks "Found chess progress from Chess for Kids on this device. Bring it
 * here?". With nothing to ask it goes straight on (`finishFirstRun`: the new-player wizard, Home or the picker). Yes imports the
 * older app's progress (`importLegacyStore`) and remembers `done`; "Not now" remembers `declined`; neither is asked again. An
 * import that does not work says so once (nothing was changed) and goes on with a single Next. The older app's own keys are
 * never touched. A look that fails (unreadable storage) means no offer: it never blocks the first run. */
export function LegacyImportStep(): JSX.Element | null {
  const { t } = useTranslation();
  const { deps } = useServices();
  const finishFirstRun = useAppStore((state) => state.finishFirstRun);
  // No child is selected during the first run: the store holds the composed default settings.
  const defaults = useAppStore((state) => state.activeProfileSettings);
  const [legacy, setLegacy] = useState<LegacyStore | null>(null);
  const [state, setState] = useState<'asking' | 'importing' | 'failed'>('asking');

  useEffect(() => {
    let cancelled = false;
    findLegacyImportOffer(window.localStorage, deps).then(
      (found) => {
        if (cancelled) return;
        if (found === undefined) void finishFirstRun();
        else setLegacy(found);
      },
      () => {
        if (!cancelled) void finishFirstRun();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [deps, finishFirstRun]);

  async function bringIt(legacyStore: LegacyStore): Promise<void> {
    setState('importing');
    try {
      // The parent area's own chunk (`parent-area.ts`): the backup import code is fetched here, once.
      const code = await import('./parent-area.ts');
      await importLegacyStore(window.localStorage, deps, legacyStore, defaults, code);
      void finishFirstRun();
    } catch {
      // Nothing was written (the import is atomic); the question counts as answered.
      storeLegacyDecision(window.localStorage, deps.app, 'declined');
      setState('failed');
    }
  }

  function notNow(): void {
    storeLegacyDecision(window.localStorage, deps.app, 'declined');
    void finishFirstRun();
  }

  if (legacy === null) return null;
  return (
    <Screen kind="center" className="gap-8 px-4 py-8 sm:px-10">
      <NarratedBubble
        text={state === 'failed' ? t('first-run.legacy.failed') : t('first-run.legacy.owl')}
        layout="stack"
      />
      {state === 'failed' ? (
        <button
          type="button"
          onClick={() => {
            void finishFirstRun();
          }}
          className={tapClass('hero', 'go')}
        >
          {t('first-run.saved.primary')}
        </button>
      ) : (
        <div className="flex w-full max-w-md flex-col gap-4">
          <button
            type="button"
            disabled={state === 'importing'}
            onClick={() => {
              void bringIt(legacy);
            }}
            className={tapClass('block', 'go')}
          >
            {t('first-run.legacy.yes')}
          </button>
          <button
            type="button"
            disabled={state === 'importing'}
            onClick={notNow}
            className={tapClass('block')}
          >
            {t('first-run.legacy.no')}
          </button>
        </div>
      )}
    </Screen>
  );
}
