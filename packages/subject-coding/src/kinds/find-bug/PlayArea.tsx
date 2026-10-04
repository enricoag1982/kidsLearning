import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ExerciseControls } from '@learn/platform-web/kinds/ExerciseControls.tsx';
import { ExerciseFrame } from '@learn/platform-web/kinds/ExercisePlay.tsx';
import { panelBody } from '@learn/platform-web/kinds/panel-body.tsx';
import { PlayIcon } from '@learn/platform-web/ui/ds/icons.tsx';
import { SECONDARY_BUTTON } from '@learn/platform-web/ui/lesson/button-styles.ts';
import { prefersReducedMotion } from '@learn/platform-web/ui/useMediaQuery.ts';
import { run } from '../../core/simulator.ts';
import { replaceTile, samePath } from '../../core/tiles.ts';
import { usesHeading } from '../../web/board/board-model.ts';
import { CodingBoard } from '../../web/board/CodingBoard.tsx';
import { ProgramStrip } from '../../web/editor/ProgramStrip.tsx';
import type { TileStatus } from '../../web/editor/ProgramStrip.tsx';
import { findBugHint } from '../../web/hint-guards.ts';
import { partialRun, stepsUntil, usePlayback } from '../../web/playback.ts';
import { useChanged } from '../../web/use-changed.ts';
import { kindsUsed } from '../program/kind.ts';
import { findBugKind } from './kind.ts';
import type { PickTileAction } from './kind.ts';
import type { FindBugPlayAreaProps } from './ui.ts';

/** How long the bug stays red before the fixed program runs. */
const MARK_MS = 700;

function FindBugPlay({
  def,
  state,
  dispatch,
  showHint,
  top,
  done,
  actions,
}: FindBugPlayAreaProps): JSX.Element {
  const { t } = useTranslation();
  const playback = usePlayback();
  /** `marked`: the bug is red; `fixed`: its tile is the fix and the fixed program runs (or ran). */
  const [phase, setPhase] = useState<'looking' | 'marked' | 'fixed'>('looking');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { core } = state;
  const hint = findBugHint(state.hint);
  const failing = useMemo(() => run(def.level, def.program), [def]);
  const fixedProgram = useMemo(() => replaceTile(def.program, def.bug, def.fix), [def]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  // Hint 1 replays the failing run and pauses on the bug.
  useChanged(state.hint, null, (next) => {
    if (findBugHint(next)?.replayUntil !== undefined) {
      playback.play(partialRun(failing, stepsUntil(failing, def.program, def.bug)));
    }
  });

  const solvedOrSolving = core.solved || phase !== 'looking';
  const program = core.solved || phase === 'fixed' ? fixedProgram : def.program;
  const busy = playback.playing || solvedOrSolving;

  function pick(path: readonly number[]): void {
    if (busy) return;
    const action: PickTileAction = { type: 'pick-tile', path };
    const { outcome } = findBugKind.act(core, action, null);
    if (outcome.kind !== 'solved') {
      dispatch(action);
      return;
    }
    // The right tile: it turns red, then the fix goes in and the program runs; the engine hears of it when the animal has arrived.
    playback.stop();
    setPhase('marked');
    timer.current = setTimeout(
      () => {
        setPhase('fixed');
        playback.play(run(def.level, fixedProgram), {
          then: () => {
            dispatch(action);
          },
        });
      },
      prefersReducedMotion() ? 0 : MARK_MS,
    );
  }

  function status(path: readonly number[]): TileStatus {
    const wrong = state.wrongPath !== undefined && samePath(path, state.wrongPath);
    return {
      ...(phase === 'marked' && samePath(path, def.bug) ? { bug: true } : {}),
      ...(wrong ? { wrong: core.errors } : {}),
      ...(hint?.candidates !== undefined &&
      !core.solved &&
      !hint.candidates.some((candidate) => samePath(candidate, path))
        ? { dim: true }
        : {}),
      ...(hint?.reveal !== undefined && !core.solved && samePath(path, hint.reveal)
        ? { flash: true }
        : {}),
    };
  }

  const current = playback.animation.current;
  const board = (
    <CodingBoard
      level={def.level}
      played={playback.animation.played}
      showHeading={usesHeading(kindsUsed(def.program))}
      {...(def.prompt === undefined ? {} : { prompt: def.prompt })}
    />
  );
  const strip = (
    <>
      {top}
      <ProgramStrip
        mode="read"
        slots={program}
        status={status}
        {...(solvedOrSolving ? {} : { onPick: pick })}
        busy={busy}
        active={
          current === null
            ? null
            : {
                path: current.path,
                ...(current.iteration === undefined ? {} : { iteration: current.iteration }),
              }
        }
      />
    </>
  );
  const controls = (
    <ExerciseControls
      showHint={showHint}
      onHint={() => {
        dispatch({ type: 'hint' });
      }}
      slot={
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            playback.play(run(def.level, def.program));
          }}
          className={SECONDARY_BUTTON}
        >
          <PlayIcon size={22} />
          {t('coding.buttons.watch')}
        </button>
      }
      extras={actions}
    />
  );
  return <ExerciseFrame board={board} panel={panelBody(strip, core.solved, done, controls)} />;
}

/** `find-bug`'s play area: an element of `FindBugPlay`, so each exercise gets its own hooks. */
export function PlayArea(props: FindBugPlayAreaProps): JSX.Element {
  return <FindBugPlay {...props} />;
}
