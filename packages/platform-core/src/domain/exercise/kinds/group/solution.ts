import type { ExerciseSolution } from '../../kind.ts';
import type { GroupDef, PutItemAction } from './def.ts';
import { groupZones } from './engine.ts';

/** Content-test-only (kept out of `GROUP_KIND` and the app bundle): every card, in display order, into its answer box. */
export const GROUP_SOLUTION: ExerciseSolution<GroupDef, PutItemAction, null> = {
  solution(def) {
    return def.items.map((item): PutItemAction => {
      const boxId = def.answer[item.id];
      if (boxId === undefined) {
        throw new Error(`group "${def.id}": no answer for item "${item.id}"`);
      }
      return { type: 'put-item', itemId: item.id, boxId };
    });
  },

  /** The first card in the first box that is not its own: exactly 1 error, nothing placed, still solvable. */
  wrongAction(def) {
    const item = def.items[0];
    const right = item === undefined ? undefined : def.answer[item.id];
    const boxId = groupZones(def).find((zone) => zone !== right);
    if (item === undefined || boxId === undefined) {
      throw new Error(`group "${def.id}": no card or no box to put it in wrongly`);
    }
    return [{ type: 'put-item', itemId: item.id, boxId }];
  },
};
