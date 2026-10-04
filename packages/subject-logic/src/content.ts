// The starter subject's content behaviour: the card kit's YAML schemas, the `series` boss and the card prompt.
import { createCardContent } from '@learn/platform-content/kinds/cards/content';
import { LOGIC_CHARACTERS } from './core.ts';

export const logicContent = createCardContent({ characters: LOGIC_CHARACTERS });
