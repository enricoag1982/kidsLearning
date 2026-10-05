import { useState } from 'react';
import type { JSX, SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChildOverview, Profile } from '@learn/platform-core';
import {
  buildChildOverview,
  changeParentPassword,
  downloadParentCodeFile,
  isValidPassword,
} from '@learn/platform-core';
import { useAppUpdate } from '../app/app-update-context.ts';
import type { Services } from '../app/services.ts';
import { useAppStore, useServices } from '../app/store.ts';
import { subjectDisplayName } from '../app/subject.ts';
import { RankPill } from './RankPill.tsx';
import { BackupScreen } from './parent/BackupPanel.tsx';
import { ChildReportScreen } from './parent/ChildReport.tsx';
import { ChildSettingsScreen } from './parent/ChildSettings.tsx';
import { PrivacyScreen } from './parent/PrivacyScreen.tsx';
import { SubjectTexts } from './parent/subject-scope.tsx';
import {
  PARENT_INPUT,
  PARENT_NOTE,
  PARENT_PRIMARY_BUTTON,
  PARENT_SECONDARY_BUTTON,
} from './parent/parent-styles.ts';
import { ChevronRightIcon, LockIcon } from './ds/icons.tsx';
import { useAsync } from './ds/useAsync.ts';
import { AvatarBadge } from './ds/AvatarBadge.tsx';
import { PARENT_TAPPABLE_ROW } from './ds/parent-styles-lazy.ts';

function ChangePasswordForm({ onDone }: { readonly onDone: () => void }): JSX.Element {
  const { t } = useTranslation();
  const services = useServices();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!isValidPassword(password)) {
      setError(t('first-run.password.too-short'));
      return;
    }
    if (password !== repeat) {
      setError(t('first-run.password.mismatch'));
      return;
    }
    await changeParentPassword(services.deps, password);
    onDone();
  }

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4"
    >
      <label className="flex flex-col gap-1 text-sm font-bold text-ink">
        {t('parent.new-password-label')}
        <input
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          className={PARENT_INPUT}
          autoComplete="new-password"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold text-ink">
        {t('first-run.password.repeat-label')}
        <input
          type="password"
          value={repeat}
          onChange={(event) => {
            setRepeat(event.target.value);
          }}
          className={PARENT_INPUT}
          autoComplete="new-password"
        />
      </label>
      {error && <p className={PARENT_NOTE}>{error}</p>}
      <div className="flex gap-3">
        <button type="submit" className={PARENT_PRIMARY_BUTTON}>
          {t('parent.save')}
        </button>
        <button type="button" onClick={onDone} className={PARENT_SECONDARY_BUTTON}>
          {t('parent.cancel')}
        </button>
      </div>
    </form>
  );
}

/** Version line plus the grown-up "Reload latest version" (`AppUpdate.forceRefresh`); offline → a status line, the button stays. */
function RefreshBlock(): JSX.Element {
  const { t } = useTranslation();
  const appUpdate = useAppUpdate();
  const [state, setState] = useState<'idle' | 'running' | 'offline'>('idle');

  async function onRefresh(): Promise<void> {
    setState('running');
    try {
      setState((await appUpdate.forceRefresh()) === 'offline' ? 'offline' : 'running');
    } catch {
      setState('idle');
    }
  }

  return (
    <section className="flex flex-col items-center gap-2 text-center">
      <p className="text-xs text-muted">{t('parent.version', { version: __APP_VERSION__ })}</p>
      <button
        type="button"
        disabled={state === 'running'}
        onClick={() => {
          void onRefresh();
        }}
        className={PARENT_SECONDARY_BUTTON}
      >
        {t('parent.refresh.button')}
      </button>
      <p className="text-xs text-muted">{t('parent.refresh.hint')}</p>
      {state === 'offline' && (
        <p role="status" className={PARENT_NOTE}>
          {t('parent.refresh.offline')}
        </p>
      )}
    </section>
  );
}

/** One subject's overview of a child, with the subject's own `Services` (its texts: rank names); or, for a subject whose pack
 * could not load, just its id (the card then shows the calm "could not be loaded" line in its place). */
type SubjectOverview =
  | { readonly subjectId: string; readonly scope: Services; readonly overview: ChildOverview }
  | { readonly subjectId: string; readonly scope: null; readonly overview: null };

/** One child's Overview card (app-structure.md §11): a tappable row (docs/screens.md §1) opening that child's report. With
 * several subjects, one line per subject (name, rank, stars); minutes and streak are the child's, once (from the first subject
 * that loaded; none when none did). A subject that failed to load gets its calm error line, the others show as usual. */
function ChildOverviewCard({
  profile,
  overviews,
  onOpen,
}: {
  readonly profile: Profile;
  readonly overviews: readonly SubjectOverview[];
  readonly onOpen: () => void;
}): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const { app } = useServices();
  const first = overviews.find((entry) => entry.overview !== null)?.overview ?? null;
  const several = overviews.length > 1;
  return (
    <li>
      <button type="button" onClick={onOpen} className={PARENT_TAPPABLE_ROW}>
        <AvatarBadge
          avatar={profile.avatar}
          className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-full p-1.5"
        />
        <span className="flex flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="text-base font-extrabold text-ink">{profile.nickname}</span>
            {!several && first && <RankPill rank={first.rank} compact />}
          </span>
          {several &&
            overviews.map(({ subjectId, scope, overview: own }) => {
              const manifest = app.subjects.find(
                (entry) => entry.manifest.id === subjectId,
              )?.manifest;
              const name = manifest ? subjectDisplayName(manifest, i18n.language) : subjectId;
              if (scope === null) {
                return (
                  <span
                    key={subjectId}
                    data-testid={`overview-subject-${subjectId}`}
                    role="status"
                    className="text-xs font-bold text-[#8C4012]"
                  >
                    {t('subjects.load-failed', { name })}
                  </span>
                );
              }
              return (
                <SubjectTexts key={subjectId} scope={scope}>
                  <span
                    data-testid={`overview-subject-${subjectId}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted"
                  >
                    <span className="font-bold text-ink">{name}</span>
                    <RankPill rank={own.rank} compact />
                    <span>{t('parent.stars-total', { count: own.totalStars })}</span>
                  </span>
                </SubjectTexts>
              );
            })}
          {first && (
            <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
              {!several && <span>{t('parent.stars-total', { count: first.totalStars })}</span>}
              <span>
                {t('parent.overview.minutes-today', { count: first.minutesToday })}
                {' · '}
                {t('parent.overview.minutes-7-days', { count: first.minutesLast7Days })}
              </span>
              {first.streakCurrent >= 2 && (
                <span>{t('parent.overview.streak', { count: first.streakCurrent })}</span>
              )}
            </span>
          )}
        </span>
        <ChevronRightIcon />
      </button>
    </li>
  );
}

type ParentView =
  | { readonly kind: 'overview' }
  | { readonly kind: 'report'; readonly profileId: string }
  | { readonly kind: 'settings'; readonly profileId: string }
  | { readonly kind: 'backup' }
  | { readonly kind: 'privacy' };

/** Parent area (parent style, ≥ 44px targets, WCAG 2.2 AA), behind the parent gate: overview → child report → settings; backup export / import. */
export function ParentAreaScreen(): JSX.Element {
  const { t } = useTranslation();
  const services = useServices();
  const profiles = useAppStore((state) => state.profiles);
  const goToPicker = useAppStore((state) => state.goToPicker);
  const refreshProfiles = useAppStore((state) => state.refreshProfiles);
  const startNewPlayer = useAppStore((state) => state.startNewPlayer);
  const [changingPassword, setChangingPassword] = useState(false);
  const [codeFileLocation, setCodeFileLocation] = useState<string | null>(null);
  const [view, setView] = useState<ParentView>({ kind: 'overview' });

  // Re-fetches on every return to `'overview'`, not only when `profiles` changes: a child's stats
  // can change (reset, an import) without the `profiles` array reference changing. With several subjects every subject
  // is activated (its pack loads once) and each child's overview is built from its scoped deps; a pack that fails to load
  // does not stop the others (its entry has no scope: the card shows the calm error line for it).
  const { value: overviews = {} } = useAsync(
    async () => {
      const scopes: readonly { readonly subjectId: string; readonly scope: Services | null }[] =
        services.app.subjects.length > 1
          ? await Promise.all(
              services.app.subjects.map(async (entry) => {
                const subjectId = entry.manifest.id;
                try {
                  return { subjectId, scope: await services.app.activate(subjectId) };
                } catch {
                  return { subjectId, scope: null };
                }
              }),
            )
          : [{ subjectId: services.subjectId, scope: services }];
      const entries = await Promise.all(
        profiles.map(
          async (profile) =>
            [
              profile.id,
              await Promise.all(
                scopes.map(async ({ subjectId, scope }): Promise<SubjectOverview> =>
                  scope === null
                    ? { subjectId, scope, overview: null }
                    : {
                        subjectId,
                        scope,
                        overview: await buildChildOverview(scope.deps, profile.id),
                      },
                ),
              ),
            ] as const,
        ),
      );
      return Object.fromEntries(entries);
    },
    [profiles, services],
    view.kind === 'overview',
  );

  const settingsProfile =
    view.kind === 'settings'
      ? profiles.find((profile) => profile.id === view.profileId)
      : undefined;

  return (
    <main className="min-h-dvh bg-[#F7F4EE] px-4 py-4 sm:px-8 sm:py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {view.kind === 'overview' && (
          <>
            <div className="flex items-center gap-3">
              <LockIcon />
              <h1 className="flex-1 text-xl font-extrabold text-ink">{t('parent.title')}</h1>
              <button
                type="button"
                onClick={() => {
                  void goToPicker();
                }}
                className={PARENT_SECONDARY_BUTTON}
              >
                {t('parent.done')}
              </button>
            </div>

            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted">
                {t('parent.children')}
              </h2>
              <ul className="flex flex-col gap-3">
                {profiles.map((profile) => {
                  const childOverviews = overviews[profile.id];
                  return childOverviews ? (
                    <ChildOverviewCard
                      key={profile.id}
                      profile={profile}
                      overviews={childOverviews}
                      onOpen={() => {
                        setView({ kind: 'report', profileId: profile.id });
                      }}
                    />
                  ) : null;
                })}
              </ul>
              <button
                type="button"
                onClick={() => {
                  startNewPlayer();
                }}
                className={PARENT_SECONDARY_BUTTON}
              >
                {t('parent.add-child')}
              </button>
            </section>

            <section className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setView({ kind: 'backup' });
                }}
                className={PARENT_TAPPABLE_ROW}
              >
                <span className="flex-1 text-sm font-extrabold text-ink">
                  {t('parent.backup-nav')}
                </span>
                <ChevronRightIcon />
              </button>
              <button
                type="button"
                onClick={() => {
                  setView({ kind: 'privacy' });
                }}
                className={PARENT_TAPPABLE_ROW}
              >
                <span className="flex-1 text-sm font-extrabold text-ink">
                  {t('parent.privacy-nav')}
                </span>
                <ChevronRightIcon />
              </button>
            </section>

            <section className="flex flex-col gap-3">
              {changingPassword ? (
                <ChangePasswordForm
                  onDone={() => {
                    setChangingPassword(false);
                  }}
                />
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setChangingPassword(true);
                    }}
                    className={PARENT_SECONDARY_BUTTON}
                  >
                    {t('parent.change-password')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void downloadParentCodeFile(services.deps).then(({ location }) => {
                        setCodeFileLocation(location);
                      });
                    }}
                    className={PARENT_SECONDARY_BUTTON}
                  >
                    {t('parent.download-code')}
                  </button>
                </div>
              )}
              {codeFileLocation !== null && (
                <p role="status" className="text-sm text-muted">
                  {t('parent.code-downloaded', { location: codeFileLocation })}
                </p>
              )}
            </section>

            <RefreshBlock />
          </>
        )}

        {view.kind === 'report' && (
          <ChildReportScreen
            key={view.profileId}
            profileId={view.profileId}
            profiles={profiles}
            onBack={() => {
              setView({ kind: 'overview' });
            }}
            onOpenSettings={() => {
              setView({ kind: 'settings', profileId: view.profileId });
            }}
          />
        )}

        {view.kind === 'settings' &&
          (settingsProfile ? (
            <ChildSettingsScreen
              key={settingsProfile.id}
              profile={settingsProfile}
              onBack={() => {
                setView({ kind: 'report', profileId: view.profileId });
              }}
              onDeleted={() => {
                setView({ kind: 'overview' });
              }}
            />
          ) : null)}

        {view.kind === 'backup' && (
          <BackupScreen
            onBack={() => {
              setView({ kind: 'overview' });
            }}
            onImported={() => {
              // Refreshes the Overview's own profile list in the background, but stays on this
              // screen (the parent reads "Import complete." first, then Back returns themselves).
              void refreshProfiles();
            }}
          />
        )}

        {view.kind === 'privacy' && (
          <PrivacyScreen
            onBack={() => {
              setView({ kind: 'overview' });
            }}
          />
        )}
      </div>
    </main>
  );
}
