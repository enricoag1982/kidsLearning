import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { CardItem } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { tContent } from '../../../content-text.ts';
import type { ContentText } from '../../../content-text.ts';
import { tapClass } from '../../../ui/ds/tap.ts';
import { ExerciseControls } from '../../ExerciseControls.tsx';
import { ExerciseFrame } from '../../ExercisePlay.tsx';
import { panelBody } from '../../panel-body.tsx';
import { CardPromptView } from '../CardPromptView.tsx';
import { CardTile } from '../CardTile.tsx';
import { cardItemLabel } from '../item-label.ts';
import type { OrderPlayAreaProps } from './ui.ts';

const TILE_SHAPE =
  'flex min-h-20 min-w-16 flex-col items-center justify-center rounded-2xl px-2 font-display';

/** The empty slots in a row, filled left to right as the kid taps the right card; the slots are info, not buttons. */
function Slots({
  items,
  placed,
  total,
}: {
  readonly items: readonly CardItem[];
  readonly placed: readonly string[];
  readonly total: number;
}): JSX.Element {
  const { t } = useTranslation();
  const text: ContentText = (key, options) => tContent(t, key, options);
  return (
    <ol aria-label={t('cards.order-slots')} className="flex flex-wrap justify-center gap-2">
      {Array.from({ length: total }, (_unused, index) => {
        const item = items.find((entry) => entry.id === placed[index]);
        const n = index + 1;
        return (
          <li
            key={index}
            data-filled={item !== undefined}
            aria-label={
              item === undefined
                ? t('cards.slot-empty', { n, total })
                : t('cards.slot-filled', { n, total, item: cardItemLabel(item, text) })
            }
            className={`flex min-h-20 min-w-16 items-center justify-center rounded-2xl px-2 font-display text-xl font-bold ${
              item === undefined
                ? 'border-2 border-dashed border-edge-locked text-muted'
                : 'border-2 border-solid border-edge-go bg-card text-ink'
            }`}
          >
            {item === undefined ? (
              <span aria-hidden="true">{n}</span>
            ) : (
              <CardTile
                item={item}
                text={item.textKey === undefined ? undefined : text(item.textKey)}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** The cards still to place, as raised tiles: a tap places one. A wrong tap shakes that card (and the note says so); a card a
 * hint ruled out is dimmed and cannot be tapped. */
function Pool({
  items,
  ruledOut,
  wrongItemId,
  errors,
  onPlace,
}: {
  readonly items: readonly CardItem[];
  readonly ruledOut: readonly string[];
  readonly wrongItemId?: string;
  readonly errors: number;
  readonly onPlace: (itemId: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const text: ContentText = (key, options) => tContent(t, key, options);
  return (
    <div
      role="group"
      aria-label={t('cards.order-pool')}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {items.map((item) => {
        const dimmed = ruledOut.includes(item.id);
        const shaking = item.id === wrongItemId;
        return (
          <button
            // The error count in the key restarts the shake when the same card is tapped wrong twice.
            key={shaking ? `${item.id}-${String(errors)}` : item.id}
            type="button"
            disabled={dimmed}
            aria-disabled={dimmed}
            aria-label={cardItemLabel(item, text)}
            data-wrong={shaking}
            onClick={() => {
              onPlace(item.id);
            }}
            className={tapClass(
              'custom',
              'neutral',
              `${TILE_SHAPE} ${dimmed ? 'opacity-50' : ''} ${shaking ? 'card-shake border-today' : ''}`,
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

/** The prompt card (if any, the board); the instruction, the slots, the Hint button and the cards left (the slots stay once solved). */
export function PlayArea({
  def,
  state,
  dispatch,
  showHint,
  top,
  done,
  actions,
}: OrderPlayAreaProps): JSX.Element {
  const { core } = state;
  const remaining = def.items.filter((item) => !core.placed.includes(item.id));
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
        ruledOut={core.ruledOut}
        wrongItemId={core.wrongItemId}
        errors={core.errors}
        onPlace={(itemId) => {
          dispatch({ type: 'place-item', itemId });
        }}
      />
    </>
  );
  // The slots stay under the instruction when solved, so the finished order is still there to see.
  const slots = (
    <>
      {top}
      <Slots items={def.items} placed={core.placed} total={def.answer.length} />
    </>
  );
  return (
    <ExerciseFrame
      board={def.prompt === undefined ? null : <CardPromptView prompt={def.prompt} />}
      panel={panelBody(slots, core.solved, done, controls)}
    />
  );
}
