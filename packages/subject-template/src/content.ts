// The starter subject's content behaviour: the card kit's YAML schemas, the `series` boss and the card prompt.
import { createCardContent } from '@learn/platform-content/kinds/cards/content';
import { TEMPLATE_CHARACTERS } from './core.ts';

export const templateContent = createCardContent({ characters: TEMPLATE_CHARACTERS });
