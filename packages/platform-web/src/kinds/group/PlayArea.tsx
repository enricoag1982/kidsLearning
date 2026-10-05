import { useState } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupHint, GroupItem, HintBase } from '@learn/platform-core';
import { tContent } from '../../content-text.ts';
import type { ContentText } from '../../content-text.ts';
import { tapClass } from '../../ui/ds/tap.ts';
import { CardTile } from '../cards/CardTile.tsx';
import { cardItemLabel } from '../cards/item-label.ts';
import { CardPromptView } from '../cards/CardPromptView.tsx';
import { ExerciseControls } from '../ExerciseControls.tsx';
import { ExerciseFrame } from '../ExercisePlay.tsx';
import { panelBody } from '../panel-body.tsx';
import { CarrollLayout, RowLayout, VennLayout } from './layouts.tsx';
import type { LayoutProps } from './layouts.tsx';
import type { GroupPlayAreaProps } from './ui.ts';

const TILE_SHAPE =
  'flex min-h-20 min-w-16 flex-col items-center justify-center rounded-2xl px-2 font-display';

/** The pool's columns by the number of cards the exercise has (not the number left, so the tiles stay put while cards are placed):
 * 2 on a phone for up to 4 cards, 3 for more; from a tablet's width one row for up to 8 cards (a tile stays above 64 px at 768 px), so
 * the cards stay on the screen next to the boxes. */
const POOL_COLUMNS: Readonly<Record<number, string>> = {
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5',
  6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
  7: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-7',
  8: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-8',
};

/** The group hint the screen is showing, if the current hint is one. */
function groupHintOf(hint: HintBase | null): GroupHint | undefined {
  return hint !== null && hint.kind === 'group' ? (hint as GroupHint) : undefined;
}

/** The cards still to sort, as raised tiles: a tap selects one (another card replaces it); the next box tap puts it there. */
function Pool({
  items,
  total,
  selected,
  onSelect,
}: {
  readonly items: readonly GroupItem[];
  /** How many cards the exercise has in all. */
  readonly total: number;
  readonly selected?: string;
  readonly onSelect: (itemId: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const text: ContentText = (key, options) => tContent(t, key, options);
  return (
    <div
      role="group"
      aria-label={t('cards.group.pool')}
      className={`grid gap-3 ${POOL_COLUMNS[total] ?? POOL_COLUMNS[4] ?? ''}`}
    >
      {items.map((item) => {
        const picked = item.id === selected;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={picked}
            aria-label={cardItemLabel(item, text)}
            data-selected={picked}
            onClick={() => {
              onSelect(item.id);
            }}
            className={tapClass(
              'custom',
              'neutral',
              `${TILE_SHAPE} ${picked ? 'tap-border-go ring-4 ring-go' : ''}`,
            )}
          >
            <CardTile
              item={item}
              text={item.textKey === undefined ? undefined : text(item.textKey)}
            />
          </button>
        );
      })}
    </div>
  );
}

/** The prompt card (if any, the board); the instruction, the boxes (a row, a Carroll table or a Venn) and, until solved, Hint and
 * the cards still in the pool. Tap a card, then the box it goes in: a wrong box shakes and the note says what got half right. */
function GroupPlay({
  def,
  state,
  dispatch,
  showHint,
  top,
  done,
  actions,
}: GroupPlayAreaProps): JSX.Element {
  const { core } = state;
  const hint = groupHintOf(state.hint);
  // The kid's own pick, tagged with the hint showing then: a newer level-2 / 3 hint selects its card instead (so the crossed-out box
  // is visible on it); a put or another pick takes over again.
  const [pick, setPick] = useState<{ readonly itemId?: string; readonly at: HintBase | null }>({
    at: null,
  });
  const hinted = hint !== undefined && hint.level !== 1 ? hint.itemId : undefined;
  const chosen = hinted !== undefined && state.hint !== pick.at ? hinted : pick.itemId;
  const selected = chosen !== undefined && core.placed[chosen] === undefined ? chosen : undefined;

  const remaining = def.items.filter((item) => core.placed[item.id] === undefined);
  const layout: LayoutProps = {
    def,
    core,
    ...(selected === undefined ? {} : { selected }),
    ruledOut: core.ruledOut
      .filter((entry) => entry.itemId === selected)
      .map((entry) => entry.boxId),
    labelsMarked: hint?.level === 1,
    ...(hint?.level === 3 ? { dropping: hint.itemId } : {}),
    onPut: (boxId) => {
      if (selected === undefined) return;
      dispatch({ type: 'put-item', itemId: selected, boxId });
    },
  };
  const boxes =
    def.layout === 'carroll' ? (
      <CarrollLayout {...layout} />
    ) : def.layout === 'venn' ? (
      <VennLayout {...layout} />
    ) : (
      <RowLayout {...layout} />
    );
  const controls = (
    <>
      <ExerciseControls
        showHint={showHint}
        onHint={() => {
          dispatch({ type: 'hint' });
        }}
        extras={actions}
      />
      <Pool
        items={remaining}
        total={def.items.length}
        {...(selected === undefined ? {} : { selected })}
        onSelect={(itemId) => {
          setPick({ itemId, at: state.hint });
        }}
      />
    </>
  );
  // The boxes stay under the instruction when solved, so the finished sort is still there to see.
  const panel = (
    <>
      {top}
      {boxes}
    </>
  );
  return (
    <ExerciseFrame
      board={def.prompt === undefined ? null : <CardPromptView prompt={def.prompt} />}
      panel={panelBody(panel, core.solved, done, controls)}
    />
  );
}

/** `group`'s play area: an element of `GroupPlay` keyed by the exercise, so each exercise gets its own selection. */
export function PlayArea(props: GroupPlayAreaProps): JSX.Element {
  return <GroupPlay key={props.def.id} {...props} />;
}
