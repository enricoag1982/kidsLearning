import { describe, expect, it } from 'vitest';
import type { JSX } from 'react';
import { render } from '@testing-library/react';
import {
  BackIcon,
  ChevronRightIcon,
  CrownIcon,
  FlagIcon,
  FlameIcon,
  PlayIcon,
  Svg,
} from './icons.tsx';

function classesOf(element: JSX.Element): readonly string[] {
  const { container } = render(element);
  return (container.querySelector('svg')?.getAttribute('class') ?? '').split(/\s+/);
}

describe('Svg', () => {
  it('never shrinks inside a flex row (a squeezed button must not collapse its icon to a dot)', () => {
    expect(classesOf(<Svg>{null}</Svg>)).toContain('shrink-0');
  });

  it('keeps shrink-0 next to the caller classes', () => {
    const classes = classesOf(<Svg className="text-muted h-6">{null}</Svg>);
    expect(classes).toEqual(['shrink-0', 'text-muted', 'h-6']);
  });

  it.each([
    ['BackIcon', <BackIcon key="back" />],
    ['ChevronRightIcon', <ChevronRightIcon key="chevron" />],
    ['CrownIcon', <CrownIcon key="crown" />],
  ])('%s is built on it, so it never shrinks either', (_name, icon) => {
    expect(classesOf(icon)).toContain('shrink-0');
  });
});

describe('standalone icons (their own svg, not built on Svg)', () => {
  it.each([
    ['PlayIcon', <PlayIcon key="play" size={22} />],
    ['FlagIcon', <FlagIcon key="flag" />],
    ['FlameIcon', <FlameIcon key="flame" />],
  ])(
    '%s never shrinks in a flex row (the Run button lost its play triangle to a dot)',
    (_name, icon) => {
      expect(classesOf(icon)).toContain('shrink-0');
    },
  );

  it('FlameIcon keeps its own size class', () => {
    expect(classesOf(<FlameIcon className="h-4 w-4" />)).toEqual(['shrink-0', 'h-4', 'w-4']);
  });
});
