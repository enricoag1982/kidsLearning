// The narrated `group` texts that are not an exercise or lesson text: its feedback notes (the Owl bubble speaks each as its own
// utterance, `docs/voice.md` §5), through the same `exerciseNote` the lesson screen calls. Derived from the compiled content only: a
// build whose content has no `group` exercise adds nothing, so a subject that does not use the kind keeps its audio inventory.
import type {
  CompiledContent,
  ExerciseDefBase,
  ExerciseFeedbackBase,
  MiniGame,
  Resolve,
  Stars,
} from '@learn/platform-core';
import { exerciseNote } from '@learn/platform-core';
import type {
  GroupDef,
  GroupHint,
  GroupMiss,
} from '@learn/platform-core/domain/exercise/kinds/group/def';
import type { NotesRegistry } from '../cards/voice.ts';

const STARS: readonly Stars[] = [1, 2, 3];

/** The three hint wordings, one per level (the ids are not spoken). */
const HINTS: readonly GroupHint[] = [
  { kind: 'group', level: 1 },
  { kind: 'group', level: 2, itemId: 'x', boxId: 'x' },
  { kind: 'group', level: 3, itemId: 'x', boxId: 'x' },
];

/** What a wrong put can get half right in each layout (`undefined` = the plain "not this box"): a row has nothing, a Carroll table the
 * axes, a Venn the shared and the outside region. */
const MISSES: Readonly<Record<GroupDef['layout'], readonly (GroupMiss | undefined)[]>> = {
  row: [undefined],
  carroll: [undefined, 'row', 'column'],
  venn: [undefined, 'overlap', 'outside'],
};

function isGroup(def: ExerciseDefBase): def is GroupDef {
  return def.type === 'group';
}

/** The rounds of a `series` boss; other games have none. */
function roundsOf(game: MiniGame): readonly ExerciseDefBase[] {
  return 'rounds' in game && Array.isArray(game.rounds)
    ? (game.rounds as readonly ExerciseDefBase[])
    : [];
}

/** Every `group` exercise of the content: guided tries, scored exercises and easier variants, then the rounds of every boss. */
function groupsOf(all: CompiledContent): readonly GroupDef[] {
  return [
    ...all.lessons.flatMap((lesson) => [
      ...lesson.guided,
      ...lesson.exercises,
      ...(lesson.variants ?? []),
    ]),
    ...all.minigames.flatMap(roundsOf),
  ].filter(isGroup);
}

/** For the `group` exercises of the content: per layout used the wrong notes it can reach (plain, and joined with the easier offer as
 * the fixed string the lesson screen can always reach), the three hints, and the 1-3 star praise. Plugs into
 * `SubjectContent.voiceTemplates` (`notes` = the subject's note table, `GROUP_NOTES` included); the inventory dedupes the texts. */
export function groupVoiceTemplates(
  notes: NotesRegistry,
): (add: (text: string, source: string) => void, r: Resolve, all: CompiledContent) => void {
  return (add, r, all) => {
    const defs = groupsOf(all);
    if (defs.length === 0) {
      return;
    }
    const speak = (feedback: ExerciseFeedbackBase, stars: Stars = 3, offer = false): void => {
      const note = exerciseNote(r, feedback, { name: '', vars: {}, stars }, notes, offer);
      if (note !== undefined) {
        add(note.text, offer ? 'exercise-note-easier-offer' : 'exercise-note');
      }
    };

    const layouts = new Set(defs.map((def) => def.layout));
    for (const layout of layouts) {
      for (const miss of MISSES[layout]) {
        const wrong = { kind: 'group-wrong', ...(miss === undefined ? {} : { miss }) };
        speak(wrong);
        speak(wrong, 3, true);
      }
    }
    for (const hint of HINTS) {
      speak({ kind: 'hint', hint });
    }
    for (const stars of STARS) {
      speak({ kind: 'solved' }, stars);
    }
  };
}
