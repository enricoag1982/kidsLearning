// The card kit's lesson surfaces (`SubjectWeb.surface`): the card prompt where chess draws its board.
import type { JSX } from 'react';
import type { ExerciseStateBase } from '@learn/platform-core';
import type { Lesson } from '@learn/platform-core';
import type {
  CardDemo,
  CardExerciseDef,
} from '@learn/platform-core/domain/exercise/kinds/cards/def';
import type { CardPrompt } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import { CharacterIcon } from '../../ui/art/characters.tsx';
import { CardPromptView } from './CardPromptView.tsx';

type CardLesson = Lesson<CardExerciseDef, CardDemo>;

/** The card of a lesson's demo, or (a demo without a prompt) the lesson's character on a card of its own. */
function DemoCard({
  lesson,
  compact,
}: {
  readonly lesson: CardLesson;
  readonly compact: boolean;
}): JSX.Element {
  const prompt: CardPrompt | undefined = lesson.demo.prompt;
  if (prompt !== undefined) return <CardPromptView prompt={prompt} compact={compact} />;
  return (
    <div className="flex h-full w-full items-center justify-center rounded-3xl border-2 border-line bg-card p-4">
      <div className={compact ? 'h-14 w-14' : 'h-32 w-32'}>
        <CharacterIcon character={lesson.character} />
      </div>
    </div>
  );
}

/** Story card: the demo's card, small on a phone column (`compact`) or beside the text. */
export function SurfaceStory({
  lesson,
  compact,
}: {
  readonly lesson: CardLesson;
  readonly compact: boolean;
}): JSX.Element {
  const card = <DemoCard lesson={lesson} compact />;
  return compact ? (
    <div className="mx-auto h-32 w-full max-w-[240px]">{card}</div>
  ) : (
    <div className="h-36 w-36 flex-shrink-0 sm:h-52 sm:w-52">{card}</div>
  );
}

/** The demo: its card at full size. */
export function SurfaceDemo({ lesson }: { readonly lesson: CardLesson }): JSX.Element {
  return <DemoCard lesson={lesson} compact={false} />;
}

/** A finished round's card: its prompt. */
export function SurfaceView({
  state,
}: {
  readonly state: ExerciseStateBase<CardExerciseDef>;
}): JSX.Element {
  const { prompt } = state.def;
  return prompt === undefined ? <div /> : <CardPromptView prompt={prompt} />;
}
