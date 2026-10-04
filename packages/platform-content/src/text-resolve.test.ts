import { describe, expect, it } from 'vitest';
import type { LocaleTree } from './schema.ts';
import { formatNumber, interpolate, resolveText, resolveTree } from './text-resolve.ts';

const tree: LocaleTree = {
  greeting: 'Hello {{name}}!',
  sum: 'What is {{a}} plus {{b}}?',
  cats_one: '{{count}} cat',
  cats_other: '{{count}} cats',
  group: { leaf: 'Deep text' },
  plain: 'Plain',
  mixed_other: 'Many',
};

describe('formatNumber', () => {
  it('writes four digits without a separator and groups from 10 000 up', () => {
    expect(formatNumber(7, 'en')).toBe('7');
    expect(formatNumber(1234, 'en')).toBe('1234');
    expect(formatNumber(9999, 'en')).toBe('9999');
    expect(formatNumber(10000, 'en')).toBe('10,000');
    expect(formatNumber(-12345, 'en')).toBe('-12,345');
  });

  it('follows the language', () => {
    expect(formatNumber(10000, 'de')).toBe('10.000');
    expect(formatNumber(1234, 'de')).toBe('1234');
  });
});

describe('resolveTree', () => {
  it('walks a dot path to a text or a subtree, undefined when a segment is missing', () => {
    expect(resolveTree(tree, 'group.leaf')).toBe('Deep text');
    expect(resolveTree(tree, 'group')).toEqual({ leaf: 'Deep text' });
    expect(resolveTree(tree, 'group.nope')).toBeUndefined();
    expect(resolveTree(tree, 'plain.deeper')).toBeUndefined();
  });
});

describe('interpolate', () => {
  it('fills known vars, keeps unknown ones, String() on numbers by default', () => {
    expect(interpolate('{{a}} + {{b}} = {{c}}', { a: 1, b: 'two' })).toBe('1 + two = {{c}}');
    expect(interpolate('{{n}}', { n: 12345 })).toBe('12345');
  });

  it('formats numbers per language on request, strings untouched', () => {
    expect(interpolate('{{n}} {{s}}', { n: 12345, s: '12345' }, { formatNumbers: true })).toBe(
      '12,345 12345',
    );
    expect(interpolate('{{n}}', { n: 12345 }, { lang: 'de', formatNumbers: true })).toBe('12.345');
  });
});

describe('resolveText', () => {
  it('interpolates a plain key', () => {
    expect(resolveText(tree, 'greeting', { name: 'Fox' })).toBe('Hello Fox!');
    expect(resolveText(tree, 'sum', { a: 3, b: 4 })).toBe('What is 3 plus 4?');
  });

  it('picks the plural form of a numeric count, the plain key without one', () => {
    expect(resolveText(tree, 'cats', { count: 1 })).toBe('1 cat');
    expect(resolveText(tree, 'cats', { count: 2 })).toBe('2 cats');
    expect(resolveText(tree, 'cats', { count: 0 })).toBe('0 cats');
    expect(resolveText(tree, 'mixed', { count: 1 })).toBeUndefined();
    expect(resolveText(tree, 'mixed', { count: 5 })).toBe('Many');
  });

  it('is undefined for a missing key or a subtree', () => {
    expect(resolveText(tree, 'nope')).toBeUndefined();
    expect(resolveText(tree, 'group')).toBeUndefined();
  });

  it('formats numbers for the given language', () => {
    expect(resolveText(tree, 'sum', { a: 10000, b: 1 }, { formatNumbers: true })).toBe(
      'What is 10,000 plus 1?',
    );
    expect(resolveText(tree, 'sum', { a: 10000, b: 1 }, { lang: 'de', formatNumbers: true })).toBe(
      'What is 10.000 plus 1?',
    );
  });
});
