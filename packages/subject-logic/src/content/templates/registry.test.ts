// The registry of logic's generated-exercise templates: exactly the W1 templates of the curriculum (§3), each with the text(s) its
// sentence needs in `lessons.yaml`.
import { describe, expect, it } from 'vitest';
import { LOGIC_TEMPLATES, logicContent } from '../logic-content.ts';
import { AUTHORED_LOCALES } from './testing.ts';

/** The W1 templates (m14.9). */
const W1_TEMPLATES = ['far-term', 'grow-next', 'pat-gap', 'pat-next', 'step-next', 'step-rule'];

/** The `templates.<key>` texts: one sentence per template, two for grow-next (picture / count), and the four rule cards of step-rule. */
const TEXT_KEYS = [
  'pat-next',
  'pat-gap',
  'step-next',
  'step-rule',
  'grow-next-choice',
  'grow-next-entry',
  'far-term',
  'rule-step',
  'rule-double',
  'rule-alt',
  'rule-grow',
];

describe('the registry', () => {
  it('holds exactly the 6 W1 templates of the curriculum, in the content too', () => {
    expect(Object.keys(LOGIC_TEMPLATES).sort()).toEqual(W1_TEMPLATES);
    expect(Object.keys(logicContent.templates ?? {}).sort()).toEqual(W1_TEMPLATES);
  });

  it('has a template text in lessons.yaml for exactly the sentences the templates use', () => {
    const texts = AUTHORED_LOCALES.en?.lessons?.templates;
    expect(typeof texts === 'object' ? Object.keys(texts).sort() : texts).toEqual(
      [...TEXT_KEYS].sort(),
    );
  });

  it('words the fixed sentences as the curriculum does', () => {
    const texts = AUTHORED_LOCALES.en?.lessons?.templates;
    expect(texts).toMatchObject({
      'pat-next': 'What comes next?',
      'pat-gap': 'What is missing?',
      'step-next': 'What number comes next?',
      'step-rule': 'Which rule makes these numbers?',
      'grow-next-choice': 'Which picture comes next?',
      'grow-next-entry': 'How many in step {{n}}?',
      'far-term': 'Which shape is number {{n}}?',
    });
  });
});
