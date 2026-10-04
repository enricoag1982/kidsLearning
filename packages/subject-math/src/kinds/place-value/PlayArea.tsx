import { useReducer, useState } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { HintBase } from '@learn/platform-core/domain/subject';
import { ExerciseControls } from '@learn/platform-web/kinds/ExerciseControls.tsx';
import { ExerciseFrame } from '@learn/platform-web/kinds/ExercisePlay.tsx';
import { panelBody } from '@learn/platform-web/kinds/panel-body.tsx';
import { CardPromptView } from '@learn/platform-web/kinds/cards/CardPromptView.tsx';
import { CheckIcon, PlusIcon, Svg } from '@learn/platform-web/ui/ds/icons.tsx';
import { tapClass } from '@learn/platform-web/ui/ds/tap.ts';
import { PRIMARY_BUTTON } from '@learn/platform-web/ui/lesson/button-styles.ts';
import type { BuildAction } from './def.ts';
import { Blocks } from './Blocks.tsx';
import { placeValueHint } from './hint-guard.ts';
import { MAX_COUNT, placesOf, startCounts, valueOf } from './model.ts';
import type { PlaceName } from './model.ts';
import type { PlaceValuePlayAreaProps } from './ui.ts';

/** At least 64 px tall, the width of the column (a column is ~70 px wide on a phone): Add and Take away stack under the blocks. */
const STEP_SHAPE =
  'flex h-16 min-w-16 w-full items-center justify-center rounded-2xl disabled:opacity-40';
const ADD_BUTTON = tapClass('custom', 'go', STEP_SHAPE);
const REMOVE_BUTTON = tapClass('custom', 'neutral', STEP_SHAPE);

/** The blocks in the columns (the draft) and what was last changed, for the live region. */
interface Draft {
  readonly counts: readonly number[];
  readonly last: { readonly column: number; readonly count: number } | null;
}

type DraftOp =
  | { readonly type: 'step'; readonly column: number; readonly by: 1 | -1 }
  /** Hint 3: the highest column gets the target's digit; the others stay as the child left them. */
  | { readonly type: 'fill'; readonly column: number; readonly count: number };

function reduceDraft(draft: Draft, op: DraftOp): Draft {
  const current = draft.counts[op.column] ?? 0;
  const count = op.type === 'fill' ? op.count : Math.min(MAX_COUNT, Math.max(0, current + op.by));
  if (count === current && op.type === 'step') return draft;
  return {
    counts: draft.counts.map((had, column) => (column === op.column ? count : had)),
    last: { column: op.column, count },
  };
}

/** Minus: a bar (the kit has a plus). */
function MinusIcon(): JSX.Element {
  return (
    <Svg size={32} strokeWidth={2.4}>
      <path d="M5 12h14" />
    </Svg>
  );
}

/** Runs `onChange(value)` in the render where `value` first differs from the last one seen: React's own way to adjust this
 * component's state to a changed input without an effect. */
function useWhenChanged<T>(value: T, onChange: (value: T) => void): void {
  const [seen, setSeen] = useState<T | null>(null);
  if (!Object.is(seen, value)) {
    setSeen(value);
    onChange(value);
  }
}

/** The target's digit hint 3 gives, with the column it belongs to; `null` for a hint without a fill. */
function filledColumn(
  hint: HintBase | null,
): { readonly column: number; readonly count: number } | null {
  const fill = placeValueHint(hint)?.fill;
  if (fill === undefined) return null;
  const column = fill.findIndex((count) => count !== 0);
  const count = fill[column];
  return count === undefined ? null : { column, count };
}

/** The columns, each headed by its place, with its blocks and its Add / Take away buttons; Check and Hint in the panel. Hooks live
 * here, in a component, so `PlayArea` below can be called as a function. */
function PlaceValuePlay({
  def,
  state,
  dispatch,
  showHint,
  top,
  done,
  actions,
}: PlaceValuePlayAreaProps): JSX.Element {
  const { t } = useTranslation();
  const [draft, change] = useReducer(reduceDraft, def, (start): Draft => ({
    counts: startCounts(start),
    last: null,
  }));
  const { core } = state;
  const places = placesOf(def.columns);
  const { counts } = draft;
  const value = valueOf(counts);

  useWhenChanged(state.hint, (next) => {
    const fill = filledColumn(next);
    if (fill !== null && !core.solved) change({ type: 'fill', ...fill });
  });

  // The labels stay emphasised and the numeral stays beside the blocks once asked for: a scaffold the child chose.
  const emphasised = core.hintLevel >= 1 && !core.solved;
  const showNumeral = core.hintLevel >= 2 || core.solved;
  const placeName = (place: PlaceName): string => t(`math.pv.name.${place}`);
  const lastPlace = draft.last === null ? undefined : places[draft.last.column];
  const announcement =
    draft.last === null || lastPlace === undefined
      ? ''
      : t('math.pv.group', { place: placeName(lastPlace), count: draft.last.count });

  const board = (
    <div className="flex h-full w-full flex-col gap-2">
      <div className={`grid h-14 shrink-0 gap-2 ${def.prompt === undefined ? '' : 'grid-cols-2'}`}>
        {def.prompt !== undefined && <CardPromptView prompt={def.prompt} compact />}
        <div
          data-testid="numeral"
          data-state={core.solved ? 'good' : 'building'}
          aria-hidden={showNumeral ? undefined : true}
          className={`flex items-center justify-center rounded-2xl border-2 bg-card font-display text-3xl font-bold ${
            showNumeral ? '' : 'invisible'
          } ${core.solved ? 'border-go text-go' : 'border-line text-ink'}`}
        >
          {showNumeral && (
            <output aria-live="polite" aria-label={t('math.pv.numeral', { value })}>
              {value}
            </output>
          )}
        </div>
      </div>
      <div
        className={`grid min-h-0 flex-1 gap-1.5 ${def.columns === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}
      >
        {places.map((place, column) => {
          const count = counts[column] ?? 0;
          const name = placeName(place);
          const one = t(`math.pv.one.${place}`);
          return (
            <div
              key={place}
              role="group"
              aria-label={t('math.pv.group', { place: name, count })}
              className="flex min-h-0 min-w-0 flex-col gap-2 rounded-2xl border-2 border-line bg-card p-1"
            >
              <p
                aria-hidden="true"
                data-emphasis={emphasised}
                className={`self-center rounded-full px-3 font-display text-lg font-bold ${
                  emphasised ? 'bg-info text-white' : 'text-ink'
                }`}
              >
                {t(`math.pv.short.${place}`)}
              </p>
              <div className="min-h-0 flex-1">
                <Blocks place={place} count={count} />
              </div>
              <button
                type="button"
                aria-label={t('math.pv.add', { place: one })}
                disabled={core.solved || count >= MAX_COUNT}
                onClick={() => {
                  change({ type: 'step', column, by: 1 });
                }}
                className={ADD_BUTTON}
              >
                <PlusIcon size={32} />
              </button>
              <button
                type="button"
                aria-label={t('math.pv.remove', { place: one })}
                disabled={core.solved || count <= 0}
                onClick={() => {
                  change({ type: 'step', column, by: -1 });
                }}
                className={REMOVE_BUTTON}
              >
                <MinusIcon />
              </button>
            </div>
          );
        })}
      </div>
      <div role="status" data-testid="announce" className="sr-only">
        {announcement}
      </div>
    </div>
  );

  const action: BuildAction = { type: 'build', counts };
  const controls = (
    <ExerciseControls
      showHint={showHint}
      onHint={() => {
        dispatch({ type: 'hint' });
      }}
      slot={
        <button
          type="button"
          disabled={value === 0}
          onClick={() => {
            dispatch(action);
          }}
          className={`${PRIMARY_BUTTON} disabled:opacity-40`}
        >
          <CheckIcon />
          {t('exercise.check')}
        </button>
      }
      extras={actions}
    />
  );
  return <ExerciseFrame board={board} panel={panelBody(top, core.solved, done, controls)} />;
}

/** `place-value`'s play area: an element of `PlaceValuePlay`, so each exercise gets its own draft. */
export function PlayArea(props: PlaceValuePlayAreaProps): JSX.Element {
  return <PlaceValuePlay {...props} />;
}
