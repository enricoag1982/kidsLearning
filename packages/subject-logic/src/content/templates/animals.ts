// The animal facts of the W2 `venn` template (docs/subjects/logic/curriculum.md §3): 16 animals with an emoji and the facts a child
// sorts them by. The table is the truth the cards carry as `tags`: `can:fly`, `can:swim`, `legs:4`, `farm`. Never a card whose fact a
// child could dispute: an animal is left out of an axis it could be argued about (`DISPUTED`).

export type AnimalFact = 'can:fly' | 'can:swim' | 'legs:4' | 'farm';

export interface Animal {
  readonly id: string;
  readonly emoji: string;
  readonly tags: readonly AnimalFact[];
}

export const ANIMALS: readonly Animal[] = [
  { id: 'duck', emoji: '🦆', tags: ['can:fly', 'can:swim', 'farm'] },
  { id: 'goat', emoji: '🐐', tags: ['legs:4', 'farm'] },
  { id: 'cow', emoji: '🐄', tags: ['legs:4', 'farm'] },
  { id: 'pig', emoji: '🐖', tags: ['legs:4', 'farm'] },
  { id: 'horse', emoji: '🐎', tags: ['legs:4', 'farm'] },
  { id: 'sheep', emoji: '🐑', tags: ['legs:4', 'farm'] },
  { id: 'fish', emoji: '🐟', tags: ['can:swim'] },
  { id: 'whale', emoji: '🐋', tags: ['can:swim'] },
  { id: 'eagle', emoji: '🦅', tags: ['can:fly'] },
  { id: 'owl', emoji: '🦉', tags: ['can:fly'] },
  { id: 'bee', emoji: '🐝', tags: ['can:fly'] },
  { id: 'frog', emoji: '🐸', tags: ['can:swim', 'legs:4'] },
  { id: 'dog', emoji: '🐕', tags: ['legs:4'] },
  { id: 'lion', emoji: '🦁', tags: ['legs:4'] },
  { id: 'penguin', emoji: '🐧', tags: ['can:swim'] },
  { id: 'bat', emoji: '🦇', tags: ['can:fly'] },
];

/** The pairs of facts a venn sorts by: `fly × swim` and `farm × legs:4`. `swim × legs:4` is not used: its only card in both circles is
 * the frog, and a frog stays out of every `legs:4` venn (its emoji is a face; four legs is not what a child sees). */
export const ANIMAL_PAIRS: readonly (readonly [AnimalFact, AnimalFact])[] = [
  ['can:fly', 'can:swim'],
  ['farm', 'legs:4'],
];

/** Animals that stay out of a venn with this fact as an axis: a child could say the table is wrong (a dog swims, a dog lives on a
 * farm; a frog has four legs, but its face is all the emoji shows). */
export const DISPUTED: Readonly<Record<AnimalFact, readonly string[]>> = {
  'can:fly': [],
  'can:swim': ['dog'],
  'legs:4': ['frog'],
  farm: ['dog'],
};

/** The animals a venn over `facts` may draw from. */
export function animalsFor(facts: readonly AnimalFact[]): readonly Animal[] {
  const out = new Set(facts.flatMap((fact) => DISPUTED[fact]));
  return ANIMALS.filter((animal) => !out.has(animal.id));
}

/** The text refs of an animal fact (`lessons.yaml` `templates.label.<name>` / `templates.not.<name>`). */
export const ANIMAL_FACT_NAME: Readonly<Record<AnimalFact, string>> = {
  'can:fly': 'can-fly',
  'can:swim': 'can-swim',
  'legs:4': 'four-legs',
  farm: 'farm',
};
