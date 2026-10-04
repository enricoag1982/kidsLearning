// A kind UI reads its own hint payload out of the session's `HintBase`.
import type { HintBase } from '@learn/platform-core/domain/subject';
import type { PlaceValueHint } from './def.ts';

export function placeValueHint(hint: HintBase | null): PlaceValueHint | null {
  return hint?.kind === 'place-value' ? (hint as PlaceValueHint) : null;
}
