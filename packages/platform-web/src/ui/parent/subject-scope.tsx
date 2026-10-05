import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { JSX, KeyboardEvent, ReactNode } from 'react';
import i18next from 'i18next';
import type { InitOptions } from 'i18next';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { i18nOptions } from '../../i18n-options.ts';
import type { Services } from '../../app/services.ts';
import { useServices } from '../../app/store.ts';
import { PackProvider, subjectDisplayName } from '../../app/subject.ts';
import { PARENT_CHIP, PARENT_CHIP_SELECTED } from '../ds/parent-styles-lazy.ts';
import { PARENT_INFO_PANEL, PARENT_NOTE } from './parent-styles.ts';

/** `scope`'s own texts (its merged bundle: platform + subject keys) for `children`. The i18n instance holds only the active
 * subject's bundle (`setSubjectLocales`), so another subject's content keys (world and lesson titles, rank names, …) need an instance
 * of their own; the active subject, and a subject loaded without bundles (tests), use the app's. */
export function SubjectTexts({
  scope,
  children,
}: {
  readonly scope: Services;
  readonly children: ReactNode;
}): JSX.Element {
  const active = useServices();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const bundles = scope.locales;
  const own = scope.subjectId !== active.subjectId && Object.keys(bundles).length > 0;
  const scoped = useMemo(() => {
    if (!own) return null;
    const instance = i18next.createInstance();
    // Resources are in memory, so `init` completes synchronously (see `initI18n`).
    void instance.init({
      ...i18nOptions(bundles as InitOptions['resources']),
      lng: language,
    });
    return instance;
  }, [own, bundles, language]);
  return scoped === null ? (
    <>{children}</>
  ) : (
    <I18nextProvider i18n={scoped}>{children}</I18nextProvider>
  );
}

const ScopeContext = createContext<Services | null>(null);

export interface SubjectScopeProviderProps {
  readonly subjectId: string;
  readonly children: ReactNode;
  /** Shown while the subject's pack loads (default: the parent area's loading line). When it fails, the calm "could not be
   * loaded" line shows instead, or nothing for `fallback={null}` (a slot that is fine empty). */
  readonly fallback?: ReactNode;
}

/** The subject a parent-area panel shows: an activated `Services` for `subjectId` (via `services.app.activate`, which loads the
 * pack once but does NOT change the app's active subject). The active subject needs no load. Below it `usePack()` is the scoped
 * pack and the texts are the scoped subject's. A pack that fails to load shows `subjects.load-failed` ("{{name}} could not be
 * loaded. Close the app and try again.") instead of the panel: the rest of the parent area keeps working. */
export function SubjectScopeProvider({
  subjectId,
  children,
  fallback,
}: SubjectScopeProviderProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const active = useServices();
  const isActive = subjectId === active.subjectId;
  const [loaded, setLoaded] = useState<Services | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  useEffect(() => {
    if (isActive) return;
    let cancelled = false;
    active.app.activate(subjectId).then(
      (services) => {
        if (!cancelled) setLoaded(services);
      },
      () => {
        if (!cancelled) setFailedId(subjectId);
      },
    );
    return () => {
      cancelled = true;
      setFailedId(null);
    };
  }, [active.app, subjectId, isActive]);

  const failed = !isActive && failedId === subjectId;
  const scope = isActive ? active : loaded?.subjectId === subjectId ? loaded : null;
  if (scope === null) {
    if (!failed) {
      return fallback === undefined ? (
        <p role="status" className={PARENT_INFO_PANEL}>
          {t('parent.report.loading')}
        </p>
      ) : (
        <>{fallback}</>
      );
    }
    // The line, except where the caller shows nothing at all (`fallback={null}`: a header slot).
    if (fallback === null) return <></>;
    const manifest = active.app.subjects.find((entry) => entry.manifest.id === subjectId)?.manifest;
    return (
      <p role="status" className={PARENT_NOTE}>
        {t('subjects.load-failed', {
          name: manifest ? subjectDisplayName(manifest, i18n.language) : subjectId,
        })}
      </p>
    );
  }
  return (
    // `key`: nothing a panel holds (state, loaded data) carries over to another subject.
    <ScopeContext.Provider key={scope.subjectId} value={scope}>
      <PackProvider value={scope.pack}>
        <SubjectTexts scope={scope}>{children}</SubjectTexts>
      </PackProvider>
    </ScopeContext.Provider>
  );
}

/** The provider's `Services`, or the store's active `services` when no provider is above. */
// eslint-disable-next-line react-refresh/only-export-components -- hook next to its provider
export function useSubjectScope(): Services {
  const scoped = useContext(ScopeContext);
  const active = useServices();
  return scoped ?? active;
}

/** Subject chips (a radio group, one radio per registered subject named by its manifest); nothing with one subject. */
export function SubjectChips({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (id: string) => void;
}): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const { app } = useServices();
  const { subjects } = app;
  if (subjects.length < 2) return null;

  // Arrow keys move the choice (and focus) like a native radio group; only the checked radio is a tab stop.
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const target = subjects[(index + step + subjects.length) % subjects.length];
    if (target === undefined) return;
    onChange(target.manifest.id);
    const radios =
      event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]');
    radios?.[(index + step + subjects.length) % subjects.length]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={t('home.subjects')} className="flex flex-wrap gap-2">
      {subjects.map(({ manifest }, index) => {
        const selected = manifest.id === value;
        return (
          <button
            key={manifest.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              onChange(manifest.id);
            }}
            onKeyDown={(event) => {
              onKeyDown(event, index);
            }}
            className={selected ? PARENT_CHIP_SELECTED : PARENT_CHIP}
          >
            {subjectDisplayName(manifest, i18n.language)}
          </button>
        );
      })}
    </div>
  );
}
