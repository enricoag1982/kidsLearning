import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { jsdomPage } from './jsdom-page.ts';

describe('jsdomPage', () => {
  it('clicks the element with the role and name, waiting for it to appear', async () => {
    const clicks: string[] = [];
    const view = render(<div />);
    const page = jsdomPage();
    const click = page.getByRole('button', { name: 'Go' }).click();
    view.rerender(
      <button
        type="button"
        onClick={() => {
          clicks.push('go');
        }}
      >
        Go on
      </button>,
    );
    await click;
    expect(clicks).toEqual(['go']);
  });

  it('presses a key on the element it focuses first, one key down per call', async () => {
    const seen: string[] = [];
    render(
      <div
        role="slider"
        aria-label="Line"
        aria-valuenow={0}
        tabIndex={0}
        onKeyDown={(event) => {
          seen.push(
            `${event.key}@${document.activeElement === event.currentTarget ? 'focused' : 'blurred'}`,
          );
        }}
      />,
    );
    const slider = jsdomPage().getByRole('slider');
    await slider.press('Home');
    await slider.press('ArrowRight');
    expect(seen).toEqual(['Home@focused', 'ArrowRight@focused']);
  });

  it('matches a string name as a case-insensitive substring, and the whole name with `exact`', async () => {
    const seen: string[] = [];
    render(
      <>
        <button
          type="button"
          onKeyDown={() => {
            seen.push('short');
          }}
        >
          Check
        </button>
        <button
          type="button"
          onKeyDown={() => {
            seen.push('long');
          }}
        >
          Check it again
        </button>
      </>,
    );
    const page = jsdomPage();
    await page.getByRole('button', { name: 'Check', exact: true }).press('x');
    await page.getByRole('button', { name: 'AGAIN' }).press('x');
    expect(seen).toEqual(['short', 'long']);
  });

  it('clicks the element with the test id, waiting for it to appear', async () => {
    const clicks: string[] = [];
    const view = render(<div />);
    const click = jsdomPage().getByTestId('grid-cell-2-1').click();
    view.rerender(
      <button
        type="button"
        data-testid="grid-cell-2-1"
        onClick={() => {
          clicks.push('cell');
        }}
      >
        Cell
      </button>,
    );
    await click;
    expect(clicks).toEqual(['cell']);
  });
});
