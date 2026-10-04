import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ANIMAL_IMAGES } from '@learn/platform-web/ui/art/animal-images.ts';
import { parseLevel } from '../../core/level.ts';
import { run } from '../../core/simulator.ts';
import { renderCodingUi } from '../testing/render-coding-ui.tsx';
import { CodingBoard } from './CodingBoard.tsx';

const level = parseLevel(['S.#', '*.F']);

describe('CodingBoard', () => {
  it('is a group named by its size, with a button-less grid of cells named by what is on them', () => {
    renderCodingUi(<CodingBoard level={level} played={[]} showHeading={false} />);
    expect(screen.getByRole('group', { name: 'Map, 3 by 2' })).toBeTruthy();
    expect(screen.getAllByRole('img').map((cell) => cell.getAttribute('aria-label'))).toEqual([
      'Row 1, column 1, Fox',
      'Row 1, column 2',
      'Row 1, column 3, rock',
      'Row 2, column 1, star',
      'Row 2, column 2',
      'Row 2, column 3, flag',
    ]);
  });

  it('draws the animal with the platform fox unless the pack has an `actor` image', () => {
    const { container } = renderCodingUi(
      <CodingBoard level={level} played={[]} showHeading={false} />,
    );
    expect(container.querySelector('[data-testid="grid-actor"] img')?.getAttribute('src')).toBe(
      ANIMAL_IMAGES.fox,
    );
  });

  it("shows a heading arrow, and names the animal's way, only when told to", () => {
    const turned = run(level, [{ kind: 'turn-right' }]).steps;
    const { unmount } = renderCodingUi(
      <CodingBoard level={level} played={turned} showHeading={false} />,
    );
    expect(screen.queryByTestId('grid-actor-heading')).toBeNull();
    expect(screen.getByRole('img', { name: 'Row 1, column 1, Fox' })).toBeTruthy();

    unmount();
    renderCodingUi(<CodingBoard level={level} played={turned} showHeading />);
    expect(screen.getByTestId('grid-actor-heading').getAttribute('data-heading')).toBe('down');
    expect(screen.getByRole('img', { name: 'Row 1, column 1, Fox, facing down' })).toBeTruthy();
  });

  it('follows the played steps: footprints, the star gone, the animal moved', () => {
    const { steps } = run(level, [{ kind: 'down' }, { kind: 'right' }]);
    renderCodingUi(<CodingBoard level={level} played={steps} showHeading={false} />);
    expect(screen.getByTestId('grid-actor').getAttribute('data-cell')).toBe('1,1');
    expect(screen.getByTestId('grid-trail-0-0')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Row 2, column 1' })).toBeTruthy();
  });

  it('names a highlight on a cell', () => {
    renderCodingUi(
      <CodingBoard
        level={level}
        played={[]}
        showHeading={false}
        highlights={{ '1,0': 'hint', '2,1': 'good', '0,1': 'bad', '1,1': 'target' }}
      />,
    );
    expect(screen.getByRole('img', { name: 'Row 1, column 2, look here' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Row 2, column 3, flag, correct' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Row 2, column 1, star, not right' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Row 2, column 2, the answer' })).toBeTruthy();
  });

  it('with onCellTap every cell is a button giving its cell', () => {
    const onCellTap = vi.fn();
    renderCodingUi(
      <CodingBoard level={level} played={[]} showHeading={false} onCellTap={onCellTap} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Row 2, column 3, flag' }));
    expect(onCellTap).toHaveBeenCalledWith({ x: 2, y: 1 });
  });

  it("shows the exercise's card prompt small above the grid", () => {
    renderCodingUi(
      <CodingBoard level={level} played={[]} showHeading={false} prompt={{ emoji: '🦊🚩' }} />,
    );
    expect(screen.getByText('🦊🚩').className).toContain('text-5xl');
    expect(screen.getByRole('group', { name: 'Map, 3 by 2' })).toBeTruthy();
  });
});
