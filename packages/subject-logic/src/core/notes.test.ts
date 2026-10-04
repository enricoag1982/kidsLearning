import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileAll } from '@learn/platform-content/compile-all';
import { resolveText } from '@learn/platform-content/text-resolve';
import { CARD_NOTES } from '@learn/platform-core/domain/exercise/kinds/cards/notes';
import { exerciseNote } from '@learn/platform-core/domain/notes';
import type { ExerciseFeedbackBase, Resolve } from '@learn/platform-core/domain/notes';
import { contentRoot } from '../../scripts/content-root.ts';
import { logicContent } from '../content/logic-content.ts';
import type { GridFillHint } from '../kinds/grid-fill/def.ts';
import { logicCore } from './logic-core.ts';
import { LOGIC_NOTES, logicHintText } from './notes.ts';
import type { CrossTechnique, SudokuTechnique } from './puzzles/index.ts';

/** A resolver that shows the key and its vars, so the test sees which text is asked for. */
const r: Resolve = (key, vars) => (vars === undefined ? key : `${key} ${JSON.stringify(vars)}`);
const note = (feedback: ExerciseFeedbackBase, offer = false) =>
  exerciseNote(r, feedback, { name: 'Pip', stars: 3, vars: {} }, logicCore.notes, offer);

const root = contentRoot(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const common = compileAll(logicContent, root).locales.en?.common ?? {};

/** The English of a `grid.*` key as the build compiled it. */
const english = (key: string): string | undefined => resolveText(common, key);

const hint = (
  patch: Partial<GridFillHint> & Pick<GridFillHint, 'level' | 'technique'>,
): GridFillHint => ({
  kind: 'grid-fill',
  units: [],
  ...patch,
});

const SUDOKU_TECHNIQUES: readonly SudokuTechnique[] = [
  'last-cell',
  'hidden-single',
  'naked-single',
];
const CROSS_TECHNIQUES: readonly CrossTechnique[] = [
  'full-line',
  'overlap',
  'cross-out',
  'combine',
];

describe('logic notes', () => {
  it('are the card kit notes plus logic’s own, in the core', () => {
    expect(Object.keys(LOGIC_NOTES).sort()).toEqual(['grid-wrong', 'hint']);
    expect(Object.keys(logicCore.notes).sort()).toEqual(
      [...new Set([...Object.keys(CARD_NOTES), ...Object.keys(LOGIC_NOTES)])].sort(),
    );
    // Every card kit note but the hint stays the kit's own object.
    for (const [kind, entry] of Object.entries(CARD_NOTES)) {
      if (kind !== 'hint') expect(logicCore.notes[kind], kind).toBe(entry);
    }
  });

  it('say the kit’s words for a card: a wrong card, a wrong place, a hint, the solved praise, and the easier offer after an error', () => {
    expect(note({ kind: 'wrong-answer' })).toEqual({
      tone: 'attention',
      text: 'exercise.answer-wrong',
    });
    expect(note({ kind: 'wrong-answer' }, true)?.text).toBe(
      'exercise.answer-wrong exercise.easier-offer',
    );
    expect(note({ kind: 'order-wrong' })?.text).toBe('cards.order-wrong');
    expect(note({ kind: 'hint', hint: { kind: 'choice', level: 3, reveal: true } })?.text).toBe(
      'exercise.hint-answer',
    );
    expect(note({ kind: 'hint', hint: { kind: 'choice', level: 1, reveal: false } })?.text).toBe(
      'exercise.hint-remove-option',
    );
    expect(note({ kind: 'solved' })?.tone).toBe('praise');
  });

  it('a rejected sudoku entry names the unit that already holds the number, else asks which numbers can still go there', () => {
    const wrong = (conflict?: 'row' | 'column' | 'box') =>
      note({
        kind: 'grid-wrong',
        puzzle: 'sudoku',
        ...(conflict === undefined ? {} : { conflict }),
      })?.text;
    expect(wrong('row')).toBe('grid.wrong.row');
    expect(wrong('column')).toBe('grid.wrong.column');
    expect(wrong('box')).toBe('grid.wrong.box');
    expect(wrong()).toBe('grid.wrong.plain');
    expect(note({ kind: 'grid-wrong', puzzle: 'sudoku', conflict: 'row' })?.tone).toBe('attention');
  });

  it('a rejected picture entry names the row or column clue, else asks to check the clues', () => {
    const wrong = (conflict?: 'row' | 'column') =>
      note({
        kind: 'grid-wrong',
        puzzle: 'picture-cross',
        ...(conflict === undefined ? {} : { conflict }),
      })?.text;
    expect(wrong('row')).toBe('grid.wrong.cross-row');
    expect(wrong('column')).toBe('grid.wrong.cross-column');
    expect(wrong()).toBe('grid.wrong.cross-plain');
  });

  it('a rejected entry is an error note: the easier offer follows it', () => {
    expect(logicCore.notes['grid-wrong']?.error).toBe(true);
    expect(note({ kind: 'grid-wrong', puzzle: 'sudoku', conflict: 'box' }, true)?.text).toBe(
      'grid.wrong.box exercise.easier-offer',
    );
    expect(logicCore.notes.hint?.error).toBeUndefined();
  });

  it('hint 1 says where to look: the unit’s kind, a picture’s line and its clue, a naked single’s cell with its three units', () => {
    const one = (units: GridFillHint['units'], technique: GridFillHint['technique']) =>
      logicHintText(r, hint({ level: 1, technique, units }));
    expect(one([{ kind: 'row', index: 3 }], 'last-cell')).toBe('grid.hint.look-row');
    expect(one([{ kind: 'column', index: 0 }], 'hidden-single')).toBe('grid.hint.look-column');
    expect(one([{ kind: 'box', index: 2 }], 'hidden-single')).toBe('grid.hint.look-box');
    expect(
      one(
        [
          { kind: 'row', index: 0 },
          { kind: 'column', index: 1 },
          { kind: 'box', index: 0 },
        ],
        'naked-single',
      ),
    ).toBe('grid.hint.look-cell');
    expect(one([{ kind: 'row', index: 1 }], 'overlap')).toBe('grid.hint.look-line-row');
    expect(one([{ kind: 'column', index: 4 }], 'combine')).toBe('grid.hint.look-line-column');
    // Nothing left to look at: the kit’s nudge.
    expect(one([], 'last-cell')).toBe('cards.hint-look');
  });

  it('hint 2 names the technique, hint 3 says watch', () => {
    for (const technique of [...SUDOKU_TECHNIQUES, ...CROSS_TECHNIQUES]) {
      expect(logicHintText(r, hint({ level: 2, technique }))).toBe(`grid.hint.${technique}`);
      expect(logicHintText(r, hint({ level: 3, technique }))).toBe('grid.hint.show');
    }
    expect(
      note({ kind: 'hint', hint: hint({ level: 2, technique: 'naked-single', cell: 4 }) })?.text,
    ).toBe('grid.hint.naked-single');
  });

  it('every key resolves in the compiled English, with no digit and no coordinate in the text', () => {
    const keys = [
      'grid.instruction.sudoku',
      'grid.instruction.cross',
      'grid.wrong.row',
      'grid.wrong.column',
      'grid.wrong.box',
      'grid.wrong.plain',
      'grid.wrong.cross-row',
      'grid.wrong.cross-column',
      'grid.wrong.cross-plain',
      'grid.hint.look-row',
      'grid.hint.look-column',
      'grid.hint.look-box',
      'grid.hint.look-cell',
      'grid.hint.look-line-row',
      'grid.hint.look-line-column',
      ...[...SUDOKU_TECHNIQUES, ...CROSS_TECHNIQUES].map((technique) => `grid.hint.${technique}`),
      'grid.hint.show',
    ];
    for (const key of keys) {
      const text = english(key);
      expect(text, key).toBeDefined();
      expect(text, key).not.toMatch(/\d/);
    }
    expect(english('grid.wrong.box')).toBe('That number is already in this box.');
    expect(english('grid.hint.show')).toBe('Watch: here it goes.');
    // The notes ask for nothing outside the table above.
    const asked = new Set<string>();
    const spy: Resolve = (key) => {
      asked.add(key);
      return key;
    };
    for (const puzzle of ['sudoku', 'picture-cross'] as const) {
      for (const conflict of [undefined, 'row', 'column', 'box'] as const) {
        exerciseNote(
          spy,
          { kind: 'grid-wrong', puzzle, ...(conflict === undefined ? {} : { conflict }) },
          { name: '', stars: 3, vars: {} },
          logicCore.notes,
          false,
        );
      }
    }
    for (const technique of [...SUDOKU_TECHNIQUES, ...CROSS_TECHNIQUES]) {
      for (const level of [1, 2, 3] as const) {
        logicHintText(spy, hint({ level, technique, units: [{ kind: 'row', index: 0 }] }));
      }
    }
    logicHintText(
      spy,
      hint({
        level: 1,
        technique: 'naked-single',
        units: [
          { kind: 'row', index: 0 },
          { kind: 'column', index: 0 },
        ],
      }),
    );
    for (const key of asked) {
      expect(keys, key).toContain(key);
    }
  });
});
