import { useRef, useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, useServices } from '../app/store.ts';
import { subjectDisplayName } from '../app/subject.ts';
import type { SubjectWebManifest } from '../app/subject.ts';
import { avatarName } from '../content-text.ts';
import { AvatarBadge } from './ds/AvatarBadge.tsx';
import { NarratedBubble } from './ds/NarratedBubble.tsx';
import { BlankScreen, RoundIconButton, Screen } from './ds/Screen.tsx';
import { CheckIcon, SwitchPlayerIcon } from './ds/icons.tsx';
import { tapClass } from './ds/tap.ts';

/** One subject's tile: its picture in a white circle over a coloured name, like a Home tile (docs/screens.md §1); the profile's
 * current (last opened) subject has a ring and a check mark, and `aria-current`. The accessible name is the subject's name. A
 * subject whose pack could not load (`unavailable`) is a disabled tile (dashed edge, no ledge, muted: `.tap-raised:disabled`). */
function SubjectTile({
  manifest,
  name,
  active,
  unavailable,
  onSelect,
}: {
  readonly manifest: SubjectWebManifest;
  readonly name: string;
  readonly active: boolean;
  readonly unavailable: boolean;
  readonly onSelect: () => void;
}): JSX.Element {
  const { bg, fg, ledge } = manifest.colors;
  return (
    <button
      type="button"
      data-testid={`subject-tile-${manifest.id}`}
      aria-current={active ? 'true' : undefined}
      disabled={unavailable}
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
        `relative flex min-h-48 w-40 flex-col items-center justify-center gap-3 rounded-[2rem] px-3 py-5 sm:min-h-56 sm:w-52${unavailable ? ' opacity-60' : ''}`,
      )}
    >
      {active && (
        <span className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white">
          <CheckIcon />
        </span>
      )}
      <span className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-white sm:h-32 sm:w-32">
        <img src={manifest.icon} alt="" className="h-20 w-20 object-contain sm:h-24 sm:w-24" />
      </span>
      <span className="font-display text-xl font-semibold sm:text-2xl">{name}</span>
    </button>
  );
}

/** The subjects hub (multi-subject.md D9): after the profile select with several subjects, and from Home's "Subjects" button.
 * One big tile per registered subject, the profile's last opened one marked (none for a profile that has not opened any); a tap
 * makes it the active subject and opens its Home. A pack that cannot load does not break the screen: that tile turns disabled and
 * the Owl says "{{name}} could not be loaded. Close the app and try again." (the other subjects stay usable). */
export function SubjectsScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const services = useServices();
  const profile = useAppStore((state) => state.profile);
  const lastSubjectId = useAppStore((state) => state.lastSubjectId);
  const selectSubject = useAppStore((state) => state.selectSubject);
  const goToPicker = useAppStore((state) => state.goToPicker);
  const selecting = useRef(false);
  /** Subjects whose pack failed to load this session, in order; a later tap is never offered (the line says to restart). */
  const [unavailable, setUnavailable] = useState<readonly string[]>([]);

  if (!profile) return <BlankScreen />;

  const lastFailed = services.app.subjects.find(
    ({ manifest }) => manifest.id === unavailable[unavailable.length - 1],
  )?.manifest;

  const select = (id: string): void => {
    if (selecting.current) return;
    selecting.current = true;
    selectSubject(id).then(
      () => {
        selecting.current = false;
      },
      () => {
        selecting.current = false;
        setUnavailable((ids) => (ids.includes(id) ? ids : [...ids, id]));
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

      <NarratedBubble
        text={
          lastFailed === undefined
            ? t('subjects.owl-line')
            : t('subjects.load-failed', { name: subjectDisplayName(lastFailed, i18n.language) })
        }
        layout="row"
      />

      {/* Two tiles per row on a phone and a portrait tablet, four in one row from 1024 px: four subjects fit without scrolling. */}
      <div className="grid flex-1 grid-cols-[repeat(2,auto)] content-center justify-center gap-4 sm:gap-6 lg:grid-cols-[repeat(4,auto)]">
        {services.app.subjects.map(({ manifest }) => (
          <SubjectTile
            key={manifest.id}
            manifest={manifest}
            name={subjectDisplayName(manifest, i18n.language)}
            active={manifest.id === lastSubjectId}
            unavailable={unavailable.includes(manifest.id)}
            onSelect={() => {
              select(manifest.id);
            }}
          />
        ))}
      </div>
    </Screen>
  );
}
