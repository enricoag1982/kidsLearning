import type { JSX } from 'react';
import type {
  CardChoiceDef,
  CardState,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { AnswerChoiceAction } from '@learn/platform-core/domain/exercise/kinds/choice/def';
import type { PlayAreaProps } from '../../kind-ui.ts';
import { CardPromptView } from '../CardPromptView.tsx';

/** What a card choice answers: the exercise's prompt card; without a prompt the options take the full width. */
export function CardStimulus({
  def,
}: PlayAreaProps<CardChoiceDef, CardState<CardChoiceDef>, AnswerChoiceAction>): JSX.Element | null {
  return def.prompt === undefined ? null : <CardPromptView prompt={def.prompt} />;
}
