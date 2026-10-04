// A test-only lesson that uses every W1 template once through a `generate:` entry (the shipped W1 lessons come in m13.10): the YAML of
// the lesson and the texts it needs in `lessons.yaml`. Never imported by shipped code, and not part of `content/`.

/** The template ids the lesson uses, in the order of its entries. */
export const W1_FIXTURE_TEMPLATES = [
  'pv-build',
  'pv-read',
  'pv-which',
  'pv-expanded',
  'cmp-sign',
  'cmp-order',
  'cmp-tf',
  'nl-place',
  'nl-estimate',
  'nl-half',
  'round-ten',
  'round-hundred',
  'round-tf',
] as const;

export const W1_FIXTURE_LESSON_ID = 'w1-fixture';

/** `lessons/<world>/w1-fixture.yaml`: one guided entry (the fixed `values` of a guided try) and twelve scored ones. */
export const W1_FIXTURE_LESSON = `id: ${W1_FIXTURE_LESSON_ID}
order: 9
concept: ${W1_FIXTURE_LESSON_ID}
character: owl
demo:
  prompt: { big: 305 }
guided:
  - id: fx-build
    generate: { template: pv-build, count: 2, seed: 1, params: { digits: 3, values: [243, 305] } }
exercises:
  - id: fx-read
    generate: { template: pv-read, count: 1, seed: 2, params: { digits: 3, zeroIn: tens } }
  - id: fx-which
    generate: { template: pv-which, count: 1, seed: 3, params: { digits: 4 } }
  - id: fx-expanded
    generate: { template: pv-expanded, count: 1, seed: 4, params: { digits: 4 } }
  - id: fx-sign
    generate: { template: cmp-sign, count: 3, seed: 5, params: { digits: 3, shared: 1 } }
  - id: fx-order
    generate: { template: cmp-order, count: 1, seed: 6, params: { digits: 4, shared: 2 } }
  - id: fx-tf
    generate: { template: cmp-tf, count: 3, seed: 7, params: { digits: 3, shared: 1 } }
  - id: fx-place
    generate: { template: nl-place, count: 2, seed: 8, params: { from: 0, to: 1000, step: 100, labels: ends } }
  - id: fx-estimate
    generate: { template: nl-estimate, count: 1, seed: 9, params: { from: 0, to: 100, step: 10, labels: ends } }
  - id: fx-half
    generate: { template: nl-half, count: 1, seed: 10, params: { unit: 100 } }
  - id: fx-ten
    generate: { template: round-ten, count: 1, seed: 11, params: { max: 100, five: true } }
  - id: fx-hundred
    generate: { template: round-hundred, count: 2, seed: 12, params: { max: 1000 } }
  - id: fx-round-tf
    generate: { template: round-tf, count: 3, seed: 13, params: { to: 10, max: 100 } }
`;

/** What the lesson's own title, story and demo need in `lessons.yaml` (every exercise text is generated). */
export const W1_FIXTURE_TEXTS = `${W1_FIXTURE_LESSON_ID}:
  title: Numbers in the meadow
  story: Every number has a place. Look where each one belongs.
  demo: The blocks show three hundreds, no tens and five ones.
`;
