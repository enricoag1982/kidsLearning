import { describe, expect, it } from 'vitest';
import type { Locales } from '../load.ts';
import {
  addGeneratedText,
  addMissingTemplateKey,
  commitGeneratedTexts,
  createGeneratedTexts,
  mergeGeneratedTexts,
} from './texts.ts';

const locales = (): Locales => ({
  en: { lessons: { b: 'B', a: 'A' }, common: { x: 'X' } },
  de: { lessons: { a: 'A-de' }, common: { x: 'X-de' } },
});

describe('mergeGeneratedTexts', () => {
  it('returns the very same locales when nothing was generated', () => {
    const input = locales();
    expect(mergeGeneratedTexts(input, createGeneratedTexts(), [])).toBe(input);
  });

  it('adds lessons.gen.<id>.<name> in every language, keys in canonical order, other namespaces untouched', () => {
    const sink = createGeneratedTexts();
    addGeneratedText(sink, 'en', 'gen.sum-2.text', 'What is 2 plus 3?');
    addGeneratedText(sink, 'de', 'gen.sum-2.text', 'Was ist 2 plus 3?');
    addGeneratedText(sink, 'en', 'gen.sum-1.text', 'What is 1 plus 1?');
    addGeneratedText(sink, 'de', 'gen.sum-1.text', 'Was ist 1 plus 1?');
    addGeneratedText(sink, 'en', 'gen.sum-1.opt-a', 'Two');
    addGeneratedText(sink, 'de', 'gen.sum-1.opt-a', 'Zwei');
    const issues: string[] = [];

    const merged = mergeGeneratedTexts(locales(), sink, issues);

    expect(issues).toEqual([]);
    expect(merged.en?.lessons).toEqual({
      a: 'A',
      b: 'B',
      gen: {
        'sum-1': { 'opt-a': 'Two', text: 'What is 1 plus 1?' },
        'sum-2': { text: 'What is 2 plus 3?' },
      },
    });
    expect(Object.keys(merged.en?.lessons ?? {})).toEqual(['a', 'b', 'gen']);
    expect(Object.keys((merged.en?.lessons?.gen as object | undefined) ?? {})).toEqual([
      'sum-1',
      'sum-2',
    ]);
    expect(merged.de?.lessons?.gen).toEqual({
      'sum-1': { 'opt-a': 'Zwei', text: 'Was ist 1 plus 1?' },
      'sum-2': { text: 'Was ist 2 plus 3?' },
    });
    expect(merged.en?.common).toEqual({ x: 'X' });
  });

  it('does not touch the input locales', () => {
    const input = locales();
    const sink = createGeneratedTexts();
    addGeneratedText(sink, 'en', 'gen.a-1.text', 'T');
    mergeGeneratedTexts(input, sink, []);
    expect(input).toEqual(locales());
  });

  it('reports an authored lessons.gen key as reserved', () => {
    const input = locales();
    input.de = { ...input.de, lessons: { ...input.de?.lessons, gen: { x: 'mine' } } };
    const issues: string[] = [];

    mergeGeneratedTexts(input, createGeneratedTexts(), issues);

    expect(issues).toEqual(['lessons: "gen" is reserved for generated texts']);
  });

  it('reports a template key a language lacks, naming the language and the key, once', () => {
    const sink = createGeneratedTexts();
    addGeneratedText(sink, 'en', 'gen.sum-1.text', 'T');
    addMissingTemplateKey(sink, 'de', 'templates.sum');
    addMissingTemplateKey(sink, 'de', 'templates.sum');
    const issues: string[] = [];

    const merged = mergeGeneratedTexts(locales(), sink, issues);

    expect(issues).toEqual([
      'de/lessons.yaml: missing text key "templates.sum" (used by a generated exercise)',
    ]);
    expect(merged.de?.lessons).toEqual({ a: 'A-de' });
  });
});

describe('commitGeneratedTexts', () => {
  it('moves a draw buffer into the sink, texts and missing keys', () => {
    const buffer = createGeneratedTexts();
    addGeneratedText(buffer, 'en', 'gen.a-1.text', 'T');
    addMissingTemplateKey(buffer, 'de', 'templates.a');
    const sink = createGeneratedTexts();
    addGeneratedText(sink, 'en', 'gen.a-0.text', 'Earlier');

    commitGeneratedTexts(buffer, sink);

    expect([...(sink.texts.get('en') ?? [])]).toEqual([
      ['gen.a-0.text', 'Earlier'],
      ['gen.a-1.text', 'T'],
    ]);
    expect([...sink.missing.values()]).toEqual([{ language: 'de', templateKey: 'templates.a' }]);
  });
});
