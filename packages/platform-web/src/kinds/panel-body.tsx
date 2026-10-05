import type { JSX, ReactNode } from 'react';

/** `top`, then (solved) `done`, else `controls` wrapped as every kind's panel always has (`mt-auto`, pinned to the bottom). */
export function panelBody(
  top: ReactNode,
  solved: boolean,
  done: ReactNode | null,
  controls: ReactNode,
): JSX.Element {
  return (
    <>
      {top}
      {solved ? done : <div className="mt-auto flex flex-col gap-3">{controls}</div>}
    </>
  );
}

/** Like `panelBody`, for an exercise whose answers are the whole exercise (a choice with no stimulus): `top`, then (solved) `done`,
 * else `centre` centred in the space left, and `controls` as the row at the bottom. */
export function centredPanelBody(
  top: ReactNode,
  solved: boolean,
  done: ReactNode | null,
  centre: ReactNode,
  controls: ReactNode,
): JSX.Element {
  return (
    <>
      {top}
      {solved ? (
        done
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col justify-center">{centre}</div>
          {controls}
        </>
      )}
    </>
  );
}
