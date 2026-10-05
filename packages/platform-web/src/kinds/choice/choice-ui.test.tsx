import { describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { ExerciseStateBase } from '@learn/platform-core';
import type {
  AnswerChoiceAction,
  ChoiceDefBase,
  ChoiceOptionBase,
  ChoiceState,
} from '@learn/platform-core/domain/exercise/kinds/choice/def';
import type { PlayAreaProps } from '../kind-ui.ts';
import { ChoiceOptions } from './ChoiceOptions.tsx';
import type { ChoiceLook, ChoiceSize } from './ChoiceOptions.tsx';
import { createChoiceUi } from './create-choice-ui.tsx';

interface NumberOption extends ChoiceOptionBase {
  readonly value?: number;
}
type NumberDef = ChoiceDefBase<NumberOption>;
type State = ExerciseStateBase<NumberDef> & ChoiceState<NumberDef>;
interface Extra {
  readonly wrongCount: number;
}

const i18n = createInstance();
await i18n.init({
  lng: 'en',
  resources: { en: { translation: { 'opt.four': 'Four', 'exercise.hint': 'Hint' } } },
});

const OPTIONS: readonly NumberOption[] = [
  { id: 'a', value: 3 },
  { id: 'b', value: 4 },
  { id: 'c', textKey: 'opt.four' },
];

const LOOK: ChoiceLook<NumberOption> = {
  visual: ({ value }) => value !== undefined && <b data-testid="numeral">{value}</b>,
  label: ({ value }, text) => `${text('opt.four')} ${String(value)}`,
};

function withI18n(ui: ReactElement): ReactElement {
  return <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>;
}

describe('ChoiceOptions', () => {
  it('draws each option as a 56px tile with its visual, and names a text-less one by the look', () => {
    render(
      withI18n(
        <ChoiceOptions options={OPTIONS} wrongOptionIds={[]} onPick={vi.fn()} look={LOOK} />,
      ),
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    for (const button of buttons) expect(button.className).toContain('min-h-14');
    expect(screen.getAllByTestId('numeral').map((node) => node.textContent)).toEqual(['3', '4']);
    expect(screen.getByRole('button', { name: 'Four 3' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Four' }).hasAttribute('aria-label')).toBe(false);
  });

  it('draws a large tile (7rem, 9rem from sm) and hands the large size to the look', () => {
    const visual = vi.fn((_option: NumberOption, size: string) => (
      <b data-testid="numeral">{size}</b>
    ));
    render(
      withI18n(
        <ChoiceOptions
          options={OPTIONS}
          wrongOptionIds={[]}
          onPick={vi.fn()}
          look={{ ...LOOK, visual, tileClass: 'min-h-20' }}
          size="large"
        />,
      ),
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.className).toContain('min-h-28');
      expect(button.className).toContain('sm:min-h-36');
      expect(button.className).not.toContain('min-h-20');
    }
    expect(screen.getAllByTestId('numeral').map((node) => node.textContent)).toEqual([
      'large',
      'large',
      'large',
    ]);
    expect(document.querySelector('[data-size]')?.getAttribute('data-size')).toBe('large');
  });

  it('draws normal tiles by default, with the normal size handed to the look', () => {
    const visual = vi.fn((_option: NumberOption, size: string) => <b>{size}</b>);
    render(
      withI18n(
        <ChoiceOptions
          options={OPTIONS.slice(0, 1)}
          wrongOptionIds={[]}
          onPick={vi.fn()}
          look={{ ...LOOK, visual }}
        />,
      ),
    );
    expect(visual).toHaveBeenCalledWith(OPTIONS[0], 'normal');
    expect(document.querySelector('[data-size]')?.getAttribute('data-size')).toBe('normal');
  });

  it('disables a wrong option in orange and reports a pick by id', () => {
    const onPick = vi.fn();
    render(
      withI18n(
        <ChoiceOptions options={OPTIONS} wrongOptionIds={['a']} onPick={onPick} look={LOOK} />,
      ),
    );
    const wrong = screen.getByRole('button', { name: 'Four 3' });
    expect(wrong.hasAttribute('disabled')).toBe(true);
    expect(wrong.className).toContain('border-today');

    screen.getByRole('button', { name: 'Four 4' }).click();
    expect(onPick).toHaveBeenCalledWith('b');
  });
});

/** The column count the grid's classes give at a container width in rem: the base `grid-cols-N`, then each container-query step
 * (`@md` 28rem, `@2xl` 42rem, `@min-[Xrem]`) that the width reaches. */
function columnsAt(className: string, widthRem: number): number {
  const steps: Record<string, number> = { md: 28, '2xl': 42 };
  let columns = 0;
  for (const token of className.split(/\s+/)) {
    const base = /^grid-cols-(\d+)$/.exec(token);
    if (base?.[1] !== undefined) columns = Number(base[1]);
    const step = /^@(?:min-\[([\d.]+)rem\]|(md|2xl)):grid-cols-(\d+)$/.exec(token);
    if (step?.[3] === undefined) continue;
    const from = step[1] === undefined ? (steps[step[2] ?? ''] ?? Infinity) : Number(step[1]);
    if (widthRem >= from) columns = Number(step[3]);
  }
  return columns;
}

/** The grid's class name for `count` options of `size`. */
function gridClass(count: number, size: ChoiceSize): string {
  const options = Array.from({ length: count }, (_unused, index) => ({ id: `o${String(index)}` }));
  const { container, unmount } = render(
    withI18n(
      <ChoiceOptions
        options={options}
        wrongOptionIds={[]}
        onPick={vi.fn()}
        look={LOOK}
        size={size}
      />,
    ),
  );
  const className = container.querySelector('[data-size]')?.className ?? '';
  unmount();
  return className;
}

describe('ChoiceOptions columns', () => {
  // A phone's card choice sits in a container about 22 rem wide (358 px); a tablet's side column is narrower or wider.
  it.each([
    ['normal', 19, 2],
    ['normal', 19.5, 3],
    ['normal', 22.4, 3],
    ['normal', 28, 3],
    ['normal', 50, 3],
    ['large', 19.5, 2],
    ['large', 20, 3],
    ['large', 22.4, 3],
    ['large', 50, 3],
  ] as const)('3 %s options: container %s rem wide -> %s per row', (size, widthRem, columns) => {
    expect(columnsAt(gridClass(3, size), widthRem)).toBe(columns);
  });

  it('a tile of 3 in a row is at least 6 rem wide at the narrowest container that gives one row', () => {
    // 3 tiles + 2 gaps (0.75 rem normal, 1 rem large) = 19.5 rem / 20 rem.
    expect((19.5 - 2 * 0.75) / 3).toBeGreaterThanOrEqual(6);
    expect((20 - 2 * 1) / 3).toBeGreaterThanOrEqual(6);
  });

  it.each([2, 4] as const)('%s options keep 2 per row on a phone, in both sizes', (count) => {
    for (const size of ['normal', 'large'] as const) {
      expect(columnsAt(gridClass(count, size), 22.4)).toBe(2);
    }
  });

  it('keeps 3 columns from 28 rem and 4 from 42 rem for 4 options', () => {
    expect(columnsAt(gridClass(4, 'normal'), 28)).toBe(3);
    expect(columnsAt(gridClass(4, 'normal'), 42)).toBe(4);
  });
});

const def: NumberDef = {
  id: 'n1',
  concept: 'count',
  textKey: 'n1',
  type: 'choice',
  options: OPTIONS,
  answer: 'b',
};

const ui = createChoiceUi<NumberDef, State, Extra>({
  initUi: () => ({ wrongCount: 0 }),
  clearWrongUi: () => ({ wrongCount: 0 }),
  stimulus: ({ state }) => (state.core.errors > 5 ? null : <p>problem card</p>),
  look: LOOK,
});

function props(
  core: Partial<State>,
  dispatch = vi.fn(),
): PlayAreaProps<NumberDef, State, AnswerChoiceAction, Extra> {
  return {
    def,
    state: {
      core: { def, moves: 0, solved: false, errors: 0, hintLevel: 0, ...core },
      hint: null,
      feedback: { kind: 'instruction' },
      wrongCount: 0,
    },
    dispatch,
    showHint: true,
    showCheck: true,
    top: <p>instruction</p>,
    done: <p>well done</p>,
  };
}

describe('createChoiceUi', () => {
  it('maps a wrong answer to the wrong-answer note and clears the kind extras', () => {
    const patch = ui.toUi(
      { kind: 'wrong' },
      { type: 'answer-choice', optionId: 'a' },
      props({}).state.core,
    );
    expect(patch).toEqual({ feedback: { kind: 'wrong-answer' }, hint: null, wrongCount: 0 });
  });

  it('maps a solved (or ignored) answer to the solved note', () => {
    const action = { type: 'answer-choice', optionId: 'b' } as const;
    const core = props({}).state.core;
    expect(ui.toUi({ kind: 'solved' }, action, core).feedback).toEqual({ kind: 'solved' });
    expect(ui.toUi({ kind: 'ignored' }, action, core).feedback).toEqual({ kind: 'solved' });
  });

  it('seeds the extras from the def', () => {
    expect(ui.initUi(def)).toEqual({ wrongCount: 0 });
    expect(ui.type).toBe('choice');
  });

  it('shows the stimulus, Hint and the options, and dispatches answers and hints', () => {
    const dispatch = vi.fn();
    render(withI18n(ui.PlayArea(props({ wrongOptions: ['a'] }, dispatch))));
    expect(screen.getByText('problem card')).toBeTruthy();
    expect(screen.getByText('instruction')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Four 3' }).hasAttribute('disabled')).toBe(true);

    screen.getByRole('button', { name: 'Four 4' }).click();
    expect(dispatch).toHaveBeenCalledWith({ type: 'answer-choice', optionId: 'b' });
    screen.getByRole('button', { name: 'Hint' }).click();
    expect(dispatch).toHaveBeenCalledWith({ type: 'hint' });
  });

  it('replaces the options by the done block once solved, and gives them the full width without a stimulus', () => {
    const { unmount } = render(withI18n(ui.PlayArea(props({ solved: true }))));
    expect(screen.getByText('well done')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    unmount();

    const { container } = render(withI18n(ui.PlayArea(props({ errors: 6 }))));
    expect(screen.queryByText('problem card')).toBeNull();
    expect(container.firstElementChild?.className).toBe('flex min-h-0 flex-1 flex-col gap-4');
  });

  it('draws large tiles centred above the Hint row without a stimulus, normal ones under it with one', () => {
    const { container, unmount } = render(withI18n(ui.PlayArea(props({ errors: 6 }))));
    expect(container.querySelector('[data-size]')?.getAttribute('data-size')).toBe('large');
    const hint = screen.getByRole('button', { name: 'Hint' });
    const tile = screen.getByRole('button', { name: 'Four 3' });
    expect(tile.compareDocumentPosition(hint)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    unmount();

    const withStimulus = render(withI18n(ui.PlayArea(props({}))));
    expect(withStimulus.container.querySelector('[data-size]')?.getAttribute('data-size')).toBe(
      'normal',
    );
    const stimulusHint = screen.getByRole('button', { name: 'Hint' });
    const stimulusTile = screen.getByRole('button', { name: 'Four 3' });
    expect(stimulusHint.compareDocumentPosition(stimulusTile)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('keeps the Hint row at 56 px unless the spec asks for large controls', () => {
    const hintRow = (): HTMLElement | null =>
      screen.getByRole('button', { name: 'Hint' }).parentElement;
    const { unmount } = render(withI18n(ui.PlayArea(props({}))));
    expect(hintRow()?.dataset.controlsSize).toBe('normal');
    unmount();

    const largeUi = createChoiceUi<NumberDef, State, Extra>({
      initUi: () => ({ wrongCount: 0 }),
      clearWrongUi: () => ({ wrongCount: 0 }),
      stimulus: () => <p>problem card</p>,
      look: LOOK,
      controlsSize: 'large',
    });
    render(withI18n(largeUi.PlayArea(props({}))));
    expect(hintRow()?.dataset.controlsSize).toBe('large');
  });

  it('shows the done block instead of the large tiles once solved', () => {
    render(withI18n(ui.PlayArea(props({ errors: 6, solved: true }))));
    expect(screen.getByText('well done')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
