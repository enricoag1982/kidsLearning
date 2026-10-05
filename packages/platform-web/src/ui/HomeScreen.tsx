import type { CSSProperties, JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { dueWarmUpStats, lessonStatus, totalStars } from '@learn/platform-core';
import { useAppStore, useServices } from '../app/store.ts';
import { usePack } from '../app/subject.ts';
import { avatarName, characterName, tContent } from '../content-text.ts';
import { InstallBanner } from './InstallBanner.tsx';
import { RankPill } from './RankPill.tsx';
import { ReplayButton } from './ds/ReplayButton.tsx';
import { SpeechBubble } from './ds/SpeechBubble.tsx';
import { StarsPill } from './StarsPill.tsx';
import { StreakPill } from './StreakPill.tsx';
import { useNarratedText } from './ds/useNarratedText.ts';
import { PlayIcon, SubjectsIcon, Svg, SwitchPlayerIcon } from './ds/icons.tsx';
import { tapClass } from './ds/tap.ts';
import { BlankScreen } from './ds/Screen.tsx';
import { AvatarBadge } from './ds/AvatarBadge.tsx';
import { useAsync } from './ds/useAsync.ts';

// Home's own tile icons: one-off shapes built on the shared `Svg` base.
function JourneyIcon(): JSX.Element {
  return (
    <Svg size={32} stroke="#2E7D5B">
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </Svg>
  );
}

function PracticeTileIcon(): JSX.Element {
  return (
    <Svg size={32} stroke="#B8561A">
      <path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18.9 5.6l-2.1 2.1M21 12h-3" />
      <circle cx={12} cy={16} r={5} />
    </Svg>
  );
}

function DenTileIcon(): JSX.Element {
  return (
    <Svg size={32} stroke="#5B3F7A">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5h4v5" />
    </Svg>
  );
}

/** One Home tile: icon in a white circle over a coloured label (docs/screens.md §1: border = `fg`, ledge = a darker shade, contrast-checked on cream). */
function HomeTile({
  icon,
  label,
  bg,
  fg,
  ledge,
  onClick,
  wide = false,
}: {
  readonly icon: JSX.Element;
  readonly label: string;
  readonly bg: string;
  readonly fg: string;
  readonly ledge: string;
  readonly onClick: () => void;
  /** A phone's 2-column grid: the odd tile out takes the whole last row (from `sm` every tile has its own column). */
  readonly wide?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      style={
        {
          backgroundColor: bg,
          color: fg,
          '--tap-border': fg,
          '--tap-ledge': ledge,
        } as CSSProperties
      }
      className={tapClass(
        'custom',
        'none',
        `flex min-h-20 flex-col items-center justify-center gap-1 rounded-[2rem] py-3 sm:min-h-24 sm:gap-2 sm:py-4 ${
          wide ? 'col-span-2 sm:col-span-1' : ''
        }`,
      )}
    >
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white sm:h-16 sm:w-16">
        {icon}
      </span>
      <span className="font-display text-lg font-semibold sm:text-2xl">{label}</span>
    </button>
  );
}

/** A header action: an icon-only 64 px round button on a phone (`label` is its accessible name), icon + text label from `sm`. */
function HeaderAction({
  label,
  onClick,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: JSX.Element;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={tapClass(
        'round',
        'neutral',
        'sm:w-auto sm:gap-2 sm:rounded-2xl sm:px-5 sm:font-display sm:text-lg sm:font-semibold',
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** Literal class names so Tailwind sees them; one column per tile on wide screens. */
const HOME_GRID_COLUMNS: Readonly<Record<number, string | undefined>> = {
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
};

export function HomeScreen(): JSX.Element {
  const { t } = useTranslation();
  const services = useServices();
  const pack = usePack();
  const profile = useAppStore((state) => state.profile);
  const progress = useAppStore((state) => state.progress);
  const journey = useAppStore((state) => state.journey);
  const conceptStats = useAppStore((state) => state.conceptStats);
  const streak = useAppStore((state) => state.streak);
  const startToday = useAppStore((state) => state.startToday);
  const goToPicker = useAppStore((state) => state.goToPicker);
  const goToSubjects = useAppStore((state) => state.goToSubjects);
  const goToJourney = useAppStore((state) => state.goToJourney);
  const goToPractice = useAppStore((state) => state.goToPractice);
  const goToDen = useAppStore((state) => state.goToDen);
  const navigate = useAppStore((state) => state.navigate);
  // jsdom (unit tests) and some browsers have no `serviceWorker`; skip the status line there.
  const { value: offlineReady = false } = useAsync(
    () => navigator.serviceWorker.ready.then(() => true),
    [],
    'serviceWorker' in navigator,
  );

  const next = journey?.next ?? null;
  const nextProgress = next ? progress.find((entry) => entry.lessonId === next.id) : undefined;
  const isResuming = next !== null && lessonStatus(next, nextProgress) === 'in-progress';
  const stars = totalStars(progress);

  // The next thing to do (domain-model.md §3): a lesson, or — once a world's lessons are all done
  // — its world boss. `next` above stays lesson-only, for the resume/character-greeting text.
  const nextStep = journey?.nextStep ?? null;
  const nextBossMiniGame =
    nextStep?.kind === 'world-boss' && nextStep.world.boss !== undefined
      ? services.deps.content.minigame(nextStep.world.boss)
      : undefined;
  // Today's warm-up (domain-model.md §3.1): shown even once every lesson is done, so the
  // "Start today" button still has something to offer (review-only sessions).
  const hasWarmUp =
    dueWarmUpStats(conceptStats, services.deps.content.lessons(), services.deps.clock.now())
      .length > 0;

  const bubbleText = !journey
    ? ''
    : !nextStep
      ? hasWarmUp
        ? t('home.owl-warmup-only')
        : t('home.owl-all-done')
      : nextStep.kind === 'world-boss'
        ? t('home.owl-world-boss', {
            title: nextBossMiniGame ? tContent(t, nextBossMiniGame.titleKey) : '',
          })
        : isResuming
          ? t('home.owl-resume')
          : pack.core.characters[nextStep.lesson.character] === undefined
            ? t('home.owl-next-topic', { topic: tContent(t, nextStep.lesson.titleKey) })
            : t('home.owl-next', { character: characterName(t, nextStep.lesson.character) });
  const replay = useNarratedText(services.narrator, bubbleText);

  if (!profile || !journey) {
    // First render before `init()` resolves; a blank cream screen for an instant beats a flash.
    return <BlankScreen />;
  }

  const showStartButton = nextStep !== null || hasWarmUp;
  const buttonLabel = isResuming ? t('continue') : t('home.start-today');
  const subtitle =
    nextStep?.kind === 'world-boss'
      ? t('home.subtitle-world-boss')
      : nextStep
        ? next?.boss
          ? t('home.subtitle-with-minigame')
          : t('home.subtitle-lesson-only')
        : t('home.subtitle-warmup');

  const tiles = [
    {
      id: 'journey',
      order: 1,
      icon: <JourneyIcon />,
      label: t('home.journey-tile'),
      colors: { bg: '#DCEFE3', fg: '#1F5A41', ledge: '#163F2E' },
      onClick: goToJourney,
    },
    {
      id: 'practice',
      order: 2,
      icon: <PracticeTileIcon />,
      label: t('home.practice-tile'),
      colors: { bg: '#FBE3D2', fg: '#7A3A10', ledge: '#55290B' },
      onClick: goToPractice,
    },
    ...(pack.homeTiles ?? []).map((tile) => ({
      id: tile.id,
      order: tile.order,
      icon: <tile.Icon />,
      label: tContent(t, tile.labelKey),
      colors: tile.colors,
      onClick: () => {
        void navigate(tile.route);
      },
    })),
    {
      id: 'den',
      order: 4,
      icon: <DenTileIcon />,
      label: t('home.den-tile'),
      colors: { bg: '#EFE4F7', fg: '#4B3A63', ledge: '#352945' },
      onClick: goToDen,
    },
  ].sort((a, b) => a.order - b.order);

  return (
    <main className="flex min-h-dvh flex-col gap-4 bg-cream px-4 py-4 sm:gap-6 sm:px-10 sm:py-8">
      <h1 className="font-display text-base text-muted sm:text-xl">{t('app.title')}</h1>

      {/* Phone: row 1 = who + the two actions, row 2 = the info pills; from `sm` one row (who, pills, actions). */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-3">
        <div className="order-1 flex min-w-0 flex-1 items-center gap-3">
          <AvatarBadge
            avatar={profile.avatar}
            label={t('home.avatar-alt', { name: avatarName(t, profile.avatar) })}
            className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full p-2 sm:h-16 sm:w-16"
          />
          <span className="truncate font-display text-2xl text-ink sm:text-3xl">
            {profile.nickname}
          </span>
        </div>
        <div className="order-3 flex basis-full flex-wrap items-center gap-x-4 gap-y-1 sm:order-2 sm:basis-auto sm:gap-3">
          {streak && streak.current >= 2 && <StreakPill days={streak.current} dense />}
          <RankPill rank={journey.rank} dense />
          <StarsPill count={stars} dense />
        </div>
        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:gap-3">
          {services.app.subjects.length > 1 && (
            <HeaderAction label={t('home.subjects')} onClick={goToSubjects}>
              <SubjectsIcon />
            </HeaderAction>
          )}
          <HeaderAction
            label={t('home.switch-player')}
            onClick={() => {
              void goToPicker();
            }}
          >
            <SwitchPlayerIcon />
          </HeaderAction>
        </div>
      </div>

      <InstallBanner />

      <div className="flex flex-1 flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex flex-1 flex-col gap-2 sm:gap-3">
          <SpeechBubble text={bubbleText} />
          <ReplayButton onClick={replay} label={t('exercise.replay')} />
        </div>
        {showStartButton && (
          <button
            type="button"
            onClick={() => {
              void startToday();
            }}
            className={tapClass(
              'custom',
              'today',
              'flex h-24 flex-col items-center justify-center gap-1 rounded-[2rem] px-8 sm:h-36 sm:w-96',
            )}
          >
            <span className="flex items-center gap-3 font-display text-2xl font-semibold sm:text-3xl">
              <PlayIcon />
              {buttonLabel}
            </span>
            <span className="text-sm font-bold sm:text-base">{subtitle}</span>
          </button>
        )}
      </div>

      <div
        className={`grid grid-cols-2 gap-3 ${HOME_GRID_COLUMNS[tiles.length] ?? 'sm:grid-cols-4'} sm:gap-6`}
      >
        {tiles.map((tile, index) => (
          <HomeTile
            key={tile.id}
            wide={tiles.length % 2 === 1 && index === tiles.length - 1}
            icon={tile.icon}
            label={tile.label}
            bg={tile.colors.bg}
            fg={tile.colors.fg}
            ledge={tile.colors.ledge}
            onClick={tile.onClick}
          />
        ))}
      </div>

      <p className="min-h-[1.75rem] text-center text-base text-go">
        {offlineReady && (
          <span className="inline-flex items-center gap-2">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('offline.ready')}
          </span>
        )}
      </p>

      <p className="-mt-2 text-center text-xs text-muted sm:-mt-4">
        {t('parent.version', { version: __APP_VERSION__ })}
      </p>
    </main>
  );
}
