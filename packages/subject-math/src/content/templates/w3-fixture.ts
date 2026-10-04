// A test-only lesson that uses every W3 template through a `generate:` entry (the shipped W3 lessons come in a later commit of m13.14):
// the YAML of the lesson and the texts it needs in `lessons.yaml`. Never imported by shipped code, and not part of `content/`.

/** The template ids the lesson uses, in the order of its entries. */
export const W3_FIXTURE_TEMPLATES = [
  'groups',
  'groups-choice',
  'array-build',
  'array-commute',
  'fact',
  'fact-missing',
  'fact-choice',
  'fact-tf',
] as const;

/** The bugs the W3 templates speak. */
export const W3_FIXTURE_BUGS = ['add-factors', 'neighbour', 'digit-swap'] as const;

export const W3_FIXTURE_LESSON_ID = 'w3-fixture';

/** `lessons/<world>/w3-fixture.yaml`: a guided `groups` and `array-build` try, then the other entries, and an `array-build` with the
 * rows free. */
export const W3_FIXTURE_LESSON = `id: ${W3_FIXTURE_LESSON_ID}
order: 9
concept: ${W3_FIXTURE_LESSON_ID}
character: owl
demo:
  prompt: { big: 3 × 4 }
guided:
  - id: fx-total
    generate: { template: groups, count: 2, seed: 1, params: { maxGroups: 3, maxSize: 4 } }
  - id: fx-build
    generate: { template: array-build, count: 2, seed: 2, params: { maxRows: 3, maxCols: 4 } }
exercises:
  - id: fx-groups-choice
    generate: { template: groups-choice, count: 2, seed: 3, params: { maxGroups: 4, maxSize: 4 } }
  - id: fx-free
    generate: { template: array-build, count: 1, seed: 4, params: { maxRows: 6, maxCols: 6, fixedRows: false } }
  - id: fx-commute
    generate: { template: array-commute, count: 3, seed: 5, params: { max: 6 } }
  - id: fx-times
    generate: { template: fact, count: 4, seed: 6, params: { tables: [2, 5, 10] } }
  - id: fx-low
    generate: { template: fact, count: 2, seed: 7, params: { tables: [7, 0, 1] } }
  - id: fx-missing
    generate: { template: fact-missing, count: 2, seed: 8, params: { tables: [3, 6, 9] } }
  - id: fx-choice
    generate: { template: fact-choice, count: 2, seed: 9, params: { tables: [4, 8] } }
  - id: fx-tf
    generate: { template: fact-tf, count: 3, seed: 10, params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], b: [2, 10] } }
`;

/** What the lesson's own title, story and demo need in `lessons.yaml` (every exercise text is generated). */
export const W3_FIXTURE_TEXTS = `${W3_FIXTURE_LESSON_ID}:
  title: Times in the forest
  story: Equal groups make times tables. Count the groups.
  demo: Three groups of four make twelve.
`;
