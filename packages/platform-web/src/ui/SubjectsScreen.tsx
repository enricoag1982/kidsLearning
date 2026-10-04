import { useRef, useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, useServices } from '../app/store.ts';
import type { SubjectWebManifest } from '../app/subject.ts';
import { avatarName } from '../content-text.ts';
import { AvatarBadge } from './ds/AvatarBadge.tsx';
import { NarratedBubble } from './ds/NarratedBubble.tsx';
import { BlankScreen, RoundIconButton, Screen } from './ds/Screen.tsx';
import { CheckIcon, SwitchPlayerIcon } from './ds/icons.tsx';
import { tapClass } from './ds/tap.ts';

/** One subject's tile: its picture in a white circle over a coloured name, like a Home tile (docs/screens.md §1); the active
 * subject has a ring and a check mark, and `aria-current`. The accessible name is the subject's name. */
function SubjectTile({
  manifest,
  name,
  active,
  onSelect,
}: {
  readonly manifest: SubjectWebManifest;
  readonly name: string;
  readonly active: boolean;
  readonly onSelect: () => void;
}): JSX.Element {
  const { bg, fg, ledge } = manifest.colors;
  return (
    <button
      type="button"
      data-testid={`subject-tile-${manifest.id}`}
      aria-current={active ? 'true' : undefined}
      onClick={onSelect}
      style={
        {
          backgroundColor: bg,
          color: fg,
          '--tap-border': fg,
          '--tap-ledge': ledge,
          ...(active ? { outline: `4px solid ${fg}`, outlineOffset: '4px' } : {}),
        } as CSSProperties
      }
      className={tapClass(
        'custom',
        'none',
        'relative flex min-h-56 w-44 flex-col items-center justify-center gap-3 rounded-[2rem] px-3 py-5 sm:w-60',
      )}
    >
      {active && (
        <span className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white">
          <CheckIcon />
        </span>
      )}
      <span className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-full bg-white sm:h-36 sm:w-36">
        <img src={manifest.icon} alt="" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
      </span>
      <span className="font-display text-xl font-semibold sm:text-2xl">{name}</span>
    </button>
  );
}

/** The subjects hub (multi-subject.md D9): after the profile select with several subjects, and from Home's "Subjects" button.
 * One big tile per registered subject; a tap makes it the active subject and opens its Home. */
export function SubjectsScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const services = useServices();
  const profile = useAppStore((state) => state.profile);
  const subjectId = useAppStore((state) => state.subjectId);
  const selectSubject = useAppStore((state) => state.selectSubject);
  const goToPicker = useAppStore((state) => state.goToPicker);
  const selecting = useRef(false);
  const [failure, setFailure] = useState<Error | null>(null);

  // A pack that cannot load (a missing chunk) reaches `AppErrorBoundary` rather than leaving the tile dead.
  if (failure !== null) throw failure;
  if (!profile) return <BlankScreen />;

  const select = (id: string): void => {
    if (selecting.current) return;
    selecting.current = true;
    selectSubject(id).then(
      () => {
        selecting.current = false;
      },
      (error: unknown) => {
        selecting.current = false;
        setFailure(error instanceof Error ? error : new Error(String(error)));
      },
    );
  };

  return (
    <Screen kind="page" className="gap-6 sm:px-10 sm:py-8">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t('subjects.title')}</h1>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AvatarBadge
            avatar={profile.avatar}
            label={t('home.avatar-alt', { name: avatarName(t, profile.avatar) })}
            className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full p-2 sm:h-16 sm:w-16"
          />
          <span className="font-display text-2xl text-ink sm:text-3xl">{profile.nickname}</span>
        </div>
        <RoundIconButton
          label={t('home.switch-player')}
          onClick={() => {
            void goToPicker();
          }}
        >
          <SwitchPlayerIcon />
        </RoundIconButton>
      </div>

      <NarratedBubble text={t('subjects.owl-line')} layout="row" />

      <div className="flex flex-1 flex-wrap content-center items-center justify-center gap-5 sm:gap-8">
        {services.app.subjects.map(({ manifest }) => (
          <SubjectTile
            key={manifest.id}
            manifest={manifest}
            name={manifest.names[i18n.language] ?? manifest.names.en ?? manifest.id}
            active={manifest.id === subjectId}
            onSelect={() => {
              select(manifest.id);
            }}
          />
        ))}
      </div>
    </Screen>
  );
}
