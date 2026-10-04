import { createInstance } from 'i18next';
import type { TFunction } from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { i18nOptions } from '../i18n-options.ts';
import { characterWithTopic } from './lesson-character-labels.ts';

let t: TFunction;

beforeAll(async () => {
  const instance = createInstance();
  await instance.init(
    i18nOptions({
      en: {
        common: { topic: { rook: 'Rook', owl: '', counter: 'Counter' } },
        journey: { ui: { 'character-piece': '{{character}} the {{piece}}' } },
      },
    }),
  );
  t = instance.t;
});

describe('characterWithTopic', () => {
  it('adds the topic to a character named apart from it: "Rhino the Rook"', () => {
    expect(characterWithTopic(t, { topicKey: 'topic.rook' }, 'Rhino')).toBe('Rhino the Rook');
    expect(characterWithTopic(t, { topicKey: 'topic.counter' }, 'Hedgie')).toBe(
      'Hedgie the Counter',
    );
  });

  it('says a character that is its topic once: "Rook"', () => {
    expect(characterWithTopic(t, { topicKey: 'topic.rook' }, 'Rook')).toBe('Rook');
  });

  it('falls back to the plain name with no topic entry', () => {
    expect(characterWithTopic(t, undefined, 'Owl')).toBe('Owl');
  });

  it('falls back to the plain name when the topic text is empty or missing', () => {
    expect(characterWithTopic(t, { topicKey: 'topic.owl' }, 'Owl')).toBe('Owl');
    expect(characterWithTopic(t, { topicKey: 'topic.nothing' }, 'Fox')).toBe('Fox');
  });
});
