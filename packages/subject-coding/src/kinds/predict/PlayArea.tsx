import { useMemo } from 'react';
import type { JSX } from 'react';
import { cellKey } from '@learn/platform-core/domain/grid';
import type { Cell } from '@learn/platform-core/domain/grid';
import { ExerciseControls } from '@learn/platform-web/kinds/ExerciseControls.tsx';
import { ExerciseFrame } from '@learn/platform-web/kinds/ExercisePlay.tsx';
import { panelBody } from '@learn/platform-web/kinds/panel-body.tsx';
import type { GridHighlight } from '@learn/platform-web/ui/grid/GridBoard.tsx';
import { run } from '../../core/simulator.ts';
import { usesHeading } from '../../web/board/board-model.ts';
import { CodingBoard } from '../../web/board/CodingBoard.tsx';
import { ProgramStrip } from '../../web/editor/ProgramStrip.tsx';
import { predictHint } from '../../web/hint-guards.ts';
import { partialRun, usePlayback } from '../../web/playback.ts';
import { useChanged } from '../../web/use-changed.ts';
import { kindsUsed } from '../program/kind.ts';
import { predictKind } from './kind.ts';
import type { PickCellAction } from './kind.ts';
import type { PredictPlayAreaProps } from './ui.ts';

/** A hint's replay waits this long at its last step, then the animal goes back to the start. */
const REPLAY_RETURN_MS = 900;

function PredictPlay({
  def,
  state,
  dispatch,
  showHint,
  top,
  done,
  actions,
}: PredictPlayAreaProps): JSX.Element {
  const playback = usePlayback();
  const { core } = state;
  const hint = predictHint(state.hint);
  const result = useMemo(() => run(def.level, def.program), [def]);

  // Hints 1 and 2 play the first steps of the program, then the animal returns to the start.
  useChanged(state.hint, null, (next) => {
    const steps = predictHint(next)?.replaySteps;
    if (steps !== undefined) {
      playback.play(partialRun(result, steps), { returnAfterMs: REPLAY_RETURN_MS });
    }
  });

  function tap(cell: Cell): void {
    if (playback.playing || core.solved) return;
    const action: PickCellAction = { type: 'pick-cell', cell };
    const { outcome } = predictKind.act(core, action, null);
    if (outcome.kind === 'solved') {
      // The right square: show the way there first, then let the engine know.
      playback.play(result, {
        then: () => {
          dispatch(action);
        },
      });
      return;
    }
    dispatch(action);
  }

  const highlights: Record<string, GridHighlight> = {};
  if (hint?.reveal !== undefined) highlights[cellKey(hint.reveal)] = 'target';
  if (state.wrongCell !== undefined) highlights[cellKey(state.wrongCell)] = 'bad';
  if (core.solved) highlights[cellKey(def.answer)] = 'good';

  const current = playback.animation.status === 'playing' ? playback.animation.current : null;
  const board = (
    <CodingBoard
      level={def.level}
      played={playback.animation.played}
      showHeading={usesHeading(kindsUsed(def.program))}
      highlights={highlights}
      onCellTap={tap}
      {...(def.prompt === undefined ? {} : { prompt: def.prompt })}
    />
  );
  const strip = (
    <>
      {top}
      <ProgramStrip
        mode="read"
        slots={def.program}
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
      extras={actions}
    />
  );
  return <ExerciseFrame board={board} panel={panelBody(strip, core.solved, done, controls)} />;
}

/** `predict`'s play area: an element of `PredictPlay`, so each exercise gets its own hooks. */
export function PlayArea(props: PredictPlayAreaProps): JSX.Element {
  return <PredictPlay {...props} />;
}
