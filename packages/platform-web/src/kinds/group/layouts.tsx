// The three boxes layouts of a group exercise: a row of 2-4 boxes, a Carroll 2 x 2 table, a Venn of two circles. Each box is one
// button named by `zoneName`; the drawn parts (headers, labels, the SVG, the placed cards) are `aria-hidden` and the cards a box
// holds are listed in its description.
import { useId } from 'react';
import type { CSSProperties, JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupBox, GroupDef, GroupState } from '@learn/platform-core';
import { CARROLL_ZONES, carrollSides } from '@learn/platform-core';
import { tContent } from '../../content-text.ts';
import type { ContentText } from '../../content-text.ts';
import { tapClass } from '../../ui/ds/tap.ts';
import { CardTile } from '../cards/CardTile.tsx';
import { cardItemLabel } from '../cards/item-label.ts';
import { ShapeCluster } from '../cards/ShapeToken.tsx';
import { zoneName } from './zone-names.ts';
import { percentOf, VENN_CIRCLES, VENN_LABELS, VENN_RECTS, VENN_VIEW } from './venn-geometry.ts';

/** What every layout reads of the play state. */
export interface LayoutProps {
  readonly def: GroupDef;
  readonly core: GroupState;
  /** The pool card the next box tap puts, if one is selected. */
  readonly selected?: string;
  /** Boxes a level-2 hint ruled out for the selected card: dimmed, not tappable. */
  readonly ruledOut: readonly string[];
  /** Level-1 hint: the box labels / headers are outlined. */
  readonly labelsMarked: boolean;
  /** A card a level-3 hint just put: it lands with a short pop. */
  readonly dropping?: string;
  readonly onPut: (boxId: string) => void;
}

const MARK = 'ring-4 ring-today ring-offset-2 ring-offset-card';

/** The box button; `header` is the label shown inside it (a row box), none for a Carroll cell or a Venn region. */
function Zone({
  props,
  zone,
  header,
  className,
  style,
}: {
  readonly props: LayoutProps;
  readonly zone: string;
  readonly header?: ReactNode;
  readonly className: string;
  readonly style?: CSSProperties;
}): JSX.Element {
  const { def, core, ruledOut, dropping, onPut } = props;
  const { t } = useTranslation();
  const text: ContentText = (key, options) => tContent(t, key, options);
  const descriptionId = useId();
  const placed = def.items.filter((item) => core.placed[item.id] === zone);
  const dimmed = ruledOut.includes(zone);
  const wrong = core.wrong?.boxId === zone;
  return (
    <>
      <button
        // The error count in the key restarts the shake when the same box is tapped wrong twice.
        key={wrong ? `${zone}-${String(core.errors)}` : zone}
        type="button"
        data-zone={zone}
        data-wrong={wrong}
        disabled={dimmed}
        aria-disabled={dimmed}
        aria-label={zoneName(def, zone, text)}
        aria-describedby={placed.length === 0 ? undefined : descriptionId}
        style={style}
        onClick={() => {
          onPut(zone);
        }}
        className={tapClass(
          'custom',
          'neutral',
          `${className} ${dimmed ? 'opacity-50' : ''} ${wrong ? 'card-shake border-today' : ''}`,
        )}
      >
        {header}
        {placed.length > 0 && (
          <span className="flex flex-wrap items-center justify-center gap-1">
            {placed.map((item) => (
              <span key={item.id} className={dropping === item.id ? 'group-drop' : undefined}>
                <CardTile
                  item={item}
                  text={item.textKey === undefined ? undefined : text(item.textKey)}
                  compact
                />
              </span>
            ))}
          </span>
        )}
      </button>
      {placed.length > 0 && (
        <span id={descriptionId} className="sr-only">
          {t('cards.group.holds', {
            items: placed.map((item) => cardItemLabel(item, text)).join(', '),
          })}
        </span>
      )}
    </>
  );
}

const BOX_SHAPE =
  'flex min-h-24 min-w-16 flex-col items-center justify-center gap-2 rounded-2xl px-2 py-2 font-display';

/** A row box's visible label: its text, emoji and shape, over the cards it holds. */
function BoxHeader({
  box,
  marked,
}: {
  readonly box: GroupBox;
  readonly marked: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <span
      aria-hidden="true"
      data-marked={marked}
      className={`flex flex-col items-center gap-1 rounded-xl px-2 ${marked ? MARK : ''}`}
    >
      {box.emoji !== undefined && <span className="text-3xl leading-none">{box.emoji}</span>}
      {box.shape !== undefined && <ShapeCluster shape={box.shape} className="h-10 w-10" />}
      {box.textKey !== undefined && (
        <span className="text-center text-lg font-bold">{tContent(t, box.textKey)}</span>
      )}
    </span>
  );
}

/** 2-4 boxes side by side; under 480 px they wrap to two columns. */
export function RowLayout(props: LayoutProps): JSX.Element {
  const boxes = props.def.boxes ?? [];
  const columns =
    boxes.length === 2
      ? 'grid-cols-2'
      : boxes.length === 3
        ? 'grid-cols-2 min-[480px]:grid-cols-3'
        : 'grid-cols-2 min-[480px]:grid-cols-4';
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t('cards.group.boxes')}
      data-group-zones=""
      data-layout="row"
      className={`grid gap-3 ${columns}`}
    >
      {boxes.map((box) => (
        <Zone
          key={box.id}
          props={props}
          zone={box.id}
          header={<BoxHeader box={box} marked={props.labelsMarked} />}
          className={BOX_SHAPE}
        />
      ))}
    </div>
  );
}

function Header({
  label,
  marked,
  scope,
}: {
  readonly label: string;
  readonly marked: boolean;
  readonly scope: 'col' | 'row';
}): JSX.Element {
  return (
    <th
      scope={scope}
      data-marked={marked}
      className="px-1 py-1 text-center align-middle font-display text-base font-bold text-ink"
    >
      <span className={`inline-block rounded-xl px-2 py-1 ${marked ? MARK : ''}`}>{label}</span>
    </th>
  );
}

/** A 2 x 2 table: the columns are axis a (yes, not), the rows axis b; one box per cell, named "column, row". */
export function CarrollLayout(props: LayoutProps): JSX.Element {
  const { def, labelsMarked } = props;
  const { t } = useTranslation();
  const text: ContentText = (key, options) => tContent(t, key, options);
  const [a, b] = def.axes ?? [];
  if (a === undefined || b === undefined) return <></>;
  const cell = (columnYes: boolean, rowYes: boolean): string =>
    CARROLL_ZONES.find((zone) => {
      const sides = carrollSides(zone);
      return sides?.a === columnYes && sides.b === rowYes;
    }) ?? CARROLL_ZONES[0];
  return (
    <table
      aria-label={t('cards.group.boxes')}
      data-group-zones=""
      data-layout="carroll"
      className="w-full table-fixed border-separate border-spacing-2"
    >
      <colgroup>
        <col className="w-[28%]" />
        <col />
        <col />
      </colgroup>
      <thead>
        <tr>
          <td />
          <Header label={text(a.textKey)} marked={labelsMarked} scope="col" />
          <Header label={text(a.notTextKey)} marked={labelsMarked} scope="col" />
        </tr>
      </thead>
      <tbody>
        {[
          { label: text(b.textKey), yes: true },
          { label: text(b.notTextKey), yes: false },
        ].map((row) => (
          <tr key={String(row.yes)}>
            <Header label={row.label} marked={labelsMarked} scope="row" />
            {[true, false].map((columnYes) => (
              <td key={String(columnYes)} className="p-0">
                <Zone
                  props={props}
                  zone={cell(columnYes, row.yes)}
                  className={`${BOX_SHAPE} w-full`}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The Venn's largest width: 28 rem and, so the cards below stay on a tablet's screen, 46 % of the screen's height; on a phone or a
 * screen up to 800 px high (a tablet in landscape) 7.5 rem less, so with an Owl note showing the sort still needs no scrolling. Never
 * under 17 rem: the zone buttons stay at least 56 px (the smallest is 76 / 340 of the board high). */
const VENN_WIDTH =
  'max-w-[min(28rem,max(17.5rem,46dvh))] [@media(max-width:639px),(max-height:800px)]:max-w-[min(28rem,max(17rem,calc(46dvh_-_7.5rem)))]';

/** Two overlapping circles in a frame (decor) and four boxes laid over the regions: both, only a, only b, neither. */
export function VennLayout(props: LayoutProps): JSX.Element {
  const { def, labelsMarked } = props;
  const { t } = useTranslation();
  const text: ContentText = (key, options) => tContent(t, key, options);
  const [a, b] = def.axes ?? [];
  if (a === undefined || b === undefined) return <></>;
  const labels = [text(a.textKey), text(b.textKey)] as const;
  const [circleA, circleB] = VENN_CIRCLES;
  return (
    <div
      role="group"
      aria-label={t('cards.group.boxes')}
      data-group-zones=""
      data-layout="venn"
      className={`relative mx-auto w-full ${VENN_WIDTH}`}
      style={{ aspectRatio: `${String(VENN_VIEW.width)} / ${String(VENN_VIEW.height)}` }}
    >
      <svg
        viewBox={`0 0 ${String(VENN_VIEW.width)} ${String(VENN_VIEW.height)}`}
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 h-full w-full"
      >
        <rect
          x={2}
          y={2}
          width={VENN_VIEW.width - 4}
          height={VENN_VIEW.height - 4}
          rx={24}
          style={{ fill: 'var(--color-cream)', stroke: 'var(--color-edge-neutral)' }}
          strokeWidth={3}
        />
        {[circleA, circleB].map((circle, index) => (
          <circle
            key={index}
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fillOpacity={0.18}
            strokeWidth={3}
            style={{
              fill: index === 0 ? 'var(--color-info)' : 'var(--color-today)',
              stroke: index === 0 ? 'var(--color-info)' : 'var(--color-today)',
            }}
          />
        ))}
      </svg>
      {VENN_LABELS.map((box, index) => (
        <span
          key={index}
          aria-hidden="true"
          data-marked={labelsMarked}
          className="absolute flex items-center justify-center"
          style={percentOf(box)}
        >
          <span
            className={`rounded-xl px-2 text-center font-display text-sm font-bold leading-tight text-ink ${labelsMarked ? MARK : ''}`}
          >
            {labels[index]}
          </span>
        </span>
      ))}
      {(['only-a', 'both', 'only-b', 'neither'] as const).map((zone) => (
        <Zone
          key={zone}
          props={props}
          zone={zone}
          style={{ position: 'absolute', ...percentOf(VENN_RECTS[zone]) }}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl p-1 font-display"
        />
      ))}
    </div>
  );
}
