import { useState } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { cellKey } from '@learn/platform-core/domain/grid';
import { ExerciseControls } from '@learn/platform-web/kinds/ExerciseControls.tsx';
import { ExerciseFrame } from '@learn/platform-web/kinds/ExercisePlay.tsx';
import { panelBody } from '@learn/platform-web/kinds/panel-body.tsx';
import { PlayIcon, Svg } from '@learn/platform-web/ui/ds/icons.tsx';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@learn/platform-web/ui/lesson/button-styles.ts';
import type { GridHighlight } from '@learn/platform-web/ui/grid/GridBoard.tsx';
import { usesHeading } from '../../web/board/board-model.ts';
import { CodingBoard } from '../../web/board/CodingBoard.tsx';
import { ProgramStrip } from '../../web/editor/ProgramStrip.tsx';
import { TileTray } from '../../web/editor/TileTray.tsx';
import { useProgramDraft } from '../../web/editor/use-program-draft.ts';
import { programHint } from '../../web/hint-guards.ts';
import { usePlayback } from '../../web/playback.ts';
import { useChanged } from '../../web/use-changed.ts';
import { kindsUsed, programKind } from './kind.ts';
import type { ProgramAction } from './kind.ts';
import type { ProgramPlayAreaProps } from './ui.ts';
import { firstMoveCell, ghostSlots, slotPathOf } from './view-model.ts';

/** A circular arrow, turning back: Reset. */
function ResetIcon(): JSX.Element {
  return (
    <Svg size={22}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </Svg>
  );
}

/** The board and its controls for `program`; hooks live here, in a component, so `PlayArea` below can be called as a function. */
function ProgramPlay({
  def,
  state,
  dispatch,
  showHint,
  top,
  done,
  actions,
}: ProgramPlayAreaProps): JSX.Element {
  const { t } = useTranslation();
  const draft = useProgramDraft(def);
  const playback = usePlayback();
  const [shakeKey, setShakeKey] = useState(0);
  const { core } = state;
  const hint = programHint(state.hint);
  const busy = playback.playing;

  // Hint 3 fills the strip with the solution (the child still taps Run); the actor goes back to the start. Not while a run plays: it
  // would cancel the run before the engine hears of it.
  useChanged(state.hint, null, (next) => {
    const reveal = programHint(next)?.reveal;
    if (reveal !== undefined && !busy) {
      playback.stop();
      draft.load(reveal);
    }
  });

  /** Every edit sends the actor back to the start. */
  const edit = (change: () => void): void => {
    playback.stop();
    change();
  };

  const program = draft.program();
  function run(): void {
    const action: ProgramAction = { type: 'run-program', program };
    const { outcome } = programKind.act(core, action, null);
    if (outcome.kind === 'solved' || outcome.kind === 'failed') {
      // Show the run first; the engine hears about it when the animal has arrived.
      playback.play(outcome.run, {
        then: () => {
          dispatch(action);
        },
      });
      return;
    }
    setShakeKey((key) => key + 1);
    dispatch(action);
  }

  const resting = playback.run === null;
  const highlights: Record<string, GridHighlight> = {};
  if (hint?.firstMove !== undefined && resting && !core.solved) {
    highlights[cellKey(firstMoveCell(def.level, hint.firstMove))] = 'hint';
  }

  const current = playback.animation.status === 'playing' ? playback.animation.current : null;
  const board = (
    <CodingBoard
      level={def.level}
      played={playback.animation.played}
      showHeading={usesHeading([...def.tray, ...kindsUsed(def.solution)])}
      highlights={highlights}
      {...(def.prompt === undefined ? {} : { prompt: def.prompt })}
    />
  );
  const strip = (
    <>
      {top}
      <ProgramStrip
        mode="edit"
        slots={draft.slots}
        {...(def.locked === undefined ? {} : { locked: def.locked })}
        openRepeat={draft.openRepeat}
        busy={busy || core.solved}
        active={
          current === null
            ? null
            : {
                path: slotPathOf(draft.slots, current.path),
                ...(current.iteration === undefined ? {} : { iteration: current.iteration }),
              }
        }
        {...(hint?.ghost !== undefined && !core.solved
          ? { ghosts: ghostSlots(draft.slots, def.solution) }
          : {})}
        onRemove={(path) => {
          edit(() => {
            draft.remove(path);
          });
        }}
        onToggleRepeat={(index) => {
          edit(() => {
            draft.toggleRepeat(index);
          });
        }}
        onCycleTimes={(index) => {
          edit(() => {
            draft.cycleTimes(index);
          });
        }}
        shakeKey={shakeKey}
      />
    </>
  );
  const controls = (
    <>
      <TileTray
        kinds={def.tray}
        disabled={busy}
        onAdd={(kind) => {
          edit(() => {
            draft.add(kind);
          });
        }}
      />
      <ExerciseControls
        showHint={showHint}
        onHint={() => {
          dispatch({ type: 'hint' });
        }}
        slot={
          <>
            <button type="button" disabled={busy} onClick={run} className={PRIMARY_BUTTON}>
              <PlayIcon size={22} />
              {t('coding.buttons.run')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                edit(() => {
                  draft.reset();
                });
              }}
              className={SECONDARY_BUTTON}
            >
              <ResetIcon />
              {t('coding.buttons.reset')}
            </button>
          </>
        }
        extras={actions}
      />
    </>
  );
  return <ExerciseFrame board={board} panel={panelBody(strip, core.solved, done, controls)} />;
}

/** `program`'s play area: an element of `ProgramPlay`, so each exercise gets its own hooks. */
export function PlayArea(props: ProgramPlayAreaProps): JSX.Element {
  return <ProgramPlay {...props} />;
}
