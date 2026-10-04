// The names of a group exercise's boxes: what a screen reader (and the e2e driver) finds on each box button. Words come from the
// content (box / axis texts) and the platform's `cards.group.*` texts.
import type { GroupBox, GroupDef } from '@learn/platform-core';
import { carrollSides } from '@learn/platform-core';
import type { ContentText } from '../../content-text.ts';
import { humanize, shapeLabel } from '../cards/item-label.ts';

/** A row box's name: its text, else its shape's name, else its emoji, else its id as words. */
export function boxLabel(box: GroupBox, text: ContentText): string {
  if (box.textKey !== undefined) return text(box.textKey);
  if (box.shape !== undefined) return shapeLabel(text, box.shape);
  return box.emoji ?? humanize(box.id);
}

/** The name of box / zone `zone` of `def`: a row's box label; a Carroll cell by its column and row ("Red, Not circle"); a Venn region
 * ("In both", "Only Red", "Only Circle", "Neither"). */
export function zoneName(def: GroupDef, zone: string, text: ContentText): string {
  if (def.layout === 'row') {
    const box = def.boxes?.find((entry) => entry.id === zone);
    return box === undefined ? humanize(zone) : boxLabel(box, text);
  }
  const [a, b] = def.axes ?? [];
  if (a === undefined || b === undefined) return humanize(zone);
  if (def.layout === 'carroll') {
    const sides = carrollSides(zone);
    return text('cards.group.zone', {
      column: text(sides?.a === true ? a.textKey : a.notTextKey),
      row: text(sides?.b === true ? b.textKey : b.notTextKey),
    });
  }
  if (zone === 'both') return text('cards.group.venn.both');
  if (zone === 'only-a') return text('cards.group.venn.only', { label: text(a.textKey) });
  if (zone === 'only-b') return text('cards.group.venn.only', { label: text(b.textKey) });
  return text('cards.group.venn.neither');
}
