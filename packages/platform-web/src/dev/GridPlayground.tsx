import { useEffect, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import {
  cellKey,
  inGrid,
  parseGridMap,
  sameCell,
  step,
  turnLeft,
  turnRight,
} from '@learn/platform-core';
import type { Cell, Heading } from '@learn/platform-core';
import { ANIMAL_IMAGES } from '../ui/art/animal-images.ts';
import { TapButton } from '../ui/ds/primitives.tsx';
import { GridBoard } from '../ui/grid/GridBoard.tsx';
import type { GridCellContent, GridHighlight } from '../ui/grid/GridBoard.tsx';

/** Dev-only playground of `GridBoard` (`/#grid`): a robot map, a sudoku-like board, a tap-to-select board, number puzzles
 * (4 × 4 and 6 × 6 sudoku with box borders, given / entered digits, pencil marks) and a picture cross with clue lanes. */

function Card({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-2xl border-2 border-line bg-card p-3 sm:p-4">
      <h2 className="mb-3 font-display text-xl text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Button({
  label,
  testId,
  onClick,
  children,
}: {
  readonly label: string;
  readonly testId: string;
  readonly onClick: () => void;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <TapButton look="compact" aria-label={label} data-testid={testId} onClick={onClick}>
      {children}
    </TapButton>
  );
}

const BOARD_BOX = 'mx-auto h-[420px] w-[420px] max-w-full';

// R robot start, # rock, S star, F flag.
const ROBOT_MAP = ['R.#S.', '.#...', '.S.#.', '...#S', '#.F..'] as const;
const ROBOT = parseGridMap(ROBOT_MAP, 'R#SF');
const ROBOT_START: Cell = ROBOT.cells['R']?.[0] ?? { x: 0, y: 0 };
const ROBOT_FLAG: Cell | undefined = ROBOT.cells['F']?.[0];
const ROBOT_WALLS = new Set((ROBOT.cells['#'] ?? []).map(cellKey));
const ROBOT_STARS = (ROBOT.cells['S'] ?? []).map(cellKey);

function RobotDemo(): JSX.Element {
  const [position, setPosition] = useState<Cell>(ROBOT_START);
  const [heading, setHeading] = useState<Heading>('right');
  const [trail, setTrail] = useState<readonly Cell[]>([]);
  const [collected, setCollected] = useState<readonly string[]>([]);
  const [bumped, setBumped] = useState(false);

  useEffect(() => {
    if (!bumped) return;
    const timer = setTimeout(() => {
      setBumped(false);
    }, 400);
    return () => {
      clearTimeout(timer);
    };
  }, [bumped]);

  function move(to: Heading): void {
    setHeading(to);
    const next = step(position, to);
    if (!inGrid(ROBOT.size, next) || ROBOT_WALLS.has(cellKey(next))) {
      setBumped(true);
      return;
    }
    setBumped(false);
    setTrail([...trail, position]);
    setPosition(next);
    const key = cellKey(next);
    if (ROBOT_STARS.includes(key) && !collected.includes(key)) {
      setCollected([...collected, key]);
    }
  }

  function reset(): void {
    setPosition(ROBOT_START);
    setHeading('right');
    setTrail([]);
    setCollected([]);
    setBumped(false);
  }

  const cells: Record<string, GridCellContent> = {};
  for (const key of ROBOT_WALLS) cells[key] = { wall: true };
  for (const key of ROBOT_STARS) {
    if (!collected.includes(key)) cells[key] = { star: true };
  }
  if (ROBOT_FLAG) cells[cellKey(ROBOT_FLAG)] = { goal: true };

  const atFlag = ROBOT_FLAG !== undefined && sameCell(position, ROBOT_FLAG);
  return (
    <Card title="Robot 5 × 5 (rocks, stars, flag, actor, trail)">
      <div className={BOARD_BOX}>
        <GridBoard
          size={ROBOT.size}
          cells={cells}
          actor={{
            cell: position,
            heading,
            image: ANIMAL_IMAGES.fox,
            label: `Fox, facing ${heading}`,
            bumped,
          }}
          trail={trail}
          label="Meadow, 5 by 5"
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button
          label="Turn left"
          testId="dev-grid-turn-left"
          onClick={() => {
            setHeading(turnLeft(heading));
          }}
        >
          ↶ Left
        </Button>
        <Button
          label="Move up"
          testId="dev-grid-up"
          onClick={() => {
            move('up');
          }}
        >
          ↑
        </Button>
        <Button
          label="Turn right"
          testId="dev-grid-turn-right"
          onClick={() => {
            setHeading(turnRight(heading));
          }}
        >
          Right ↷
        </Button>
        <Button
          label="Move left"
          testId="dev-grid-left"
          onClick={() => {
            move('left');
          }}
        >
          ←
        </Button>
        <Button
          label="Move down"
          testId="dev-grid-down"
          onClick={() => {
            move('down');
          }}
        >
          ↓
        </Button>
        <Button
          label="Move right"
          testId="dev-grid-right"
          onClick={() => {
            move('right');
          }}
        >
          →
        </Button>
        <Button label="Reset" testId="dev-grid-reset" onClick={reset}>
          Reset
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted" data-testid="dev-grid-status">
        Stars {collected.length} / {ROBOT_STARS.length}
        {atFlag ? ' · flag reached' : ''}
      </p>
    </Card>
  );
}

const SUDOKU_GIVEN = ['1..4', '.3..', '..2.', '4..1'] as const;
const SUDOKU_SIZE = { cols: 4, rows: 4 } as const;

function SudokuDemo(): JSX.Element {
  const [entries, setEntries] = useState<Readonly<Record<string, string>>>({});
  const [selected, setSelected] = useState<Cell | null>(null);

  const digits: Record<string, string> = {};
  const given = new Set<string>();
  SUDOKU_GIVEN.forEach((row, y) => {
    Array.from(row).forEach((char, x) => {
      if (char !== '.') {
        digits[cellKey({ x, y })] = char;
        given.add(cellKey({ x, y }));
      }
    });
  });
  Object.assign(digits, entries);

  const cells: Record<string, GridCellContent> = {};
  for (const [key, digit] of Object.entries(digits)) {
    cells[key] = {
      item: { text: digit, label: digit },
      tone: given.has(key) ? 'filled' : 'neutral',
    };
  }

  // A digit repeated in its row or column is marked wrong (the ✕ mark, not colour alone).
  const highlights: Record<string, GridHighlight> = {};
  for (const [key, digit] of Object.entries(digits)) {
    const [x = 0, y = 0] = key.split(',').map(Number);
    const clash = Object.entries(digits).some(([other, otherDigit]) => {
      const [ox = 0, oy = 0] = other.split(',').map(Number);
      return other !== key && otherDigit === digit && (ox === x || oy === y);
    });
    if (clash) highlights[key] = 'bad';
  }
  if (selected) highlights[cellKey(selected)] ??= 'selected';

  function place(digit: string | null): void {
    if (!selected || given.has(cellKey(selected))) return;
    const key = cellKey(selected);
    const others = Object.entries(entries).filter(([other]) => other !== key);
    setEntries(Object.fromEntries(digit === null ? others : [...others, [key, digit]]));
  }

  return (
    <Card title="Sudoku-like 4 × 4 (items, filled tone, tap to select, clashes marked)">
      <div className={BOARD_BOX}>
        <GridBoard
          size={SUDOKU_SIZE}
          cells={cells}
          highlights={highlights}
          onCellTap={setSelected}
          label="Number puzzle, 4 by 4"
        />
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {['1', '2', '3', '4'].map((digit) => (
          <Button
            key={digit}
            label={`Put ${digit}`}
            testId={`dev-grid-digit-${digit}`}
            onClick={() => {
              place(digit);
            }}
          >
            {digit}
          </Button>
        ))}
        <Button
          label="Clear the cell"
          testId="dev-grid-digit-clear"
          onClick={() => {
            place(null);
          }}
        >
          ✕
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted">
        Dark cells are given; select a light cell, then a digit.
      </p>
    </Card>
  );
}

/** A puzzle as rows of digits, `.` = empty. */
function digitCells(
  givens: readonly string[],
  entries: Readonly<Record<string, string>>,
  marks: Readonly<Record<string, readonly string[]>>,
): Record<string, GridCellContent> {
  const cells: Record<string, GridCellContent> = {};
  givens.forEach((row, y) => {
    Array.from(row).forEach((char, x) => {
      if (char !== '.') {
        cells[cellKey({ x, y })] = { item: { text: char, label: char, style: 'given' } };
      }
    });
  });
  for (const [key, digit] of Object.entries(entries)) {
    cells[key] = { item: { text: digit, label: digit, style: 'entry' } };
  }
  for (const [key, list] of Object.entries(marks)) cells[key] = { ...cells[key], marks: list };
  return cells;
}

const NUMBER_BOX = 'mx-auto aspect-square w-full max-w-[420px]';

const SUDOKU4_GIVEN = ['1..4', '.41.', '2..3', '.32.'] as const;
const SUDOKU4_CELLS = digitCells(
  SUDOKU4_GIVEN,
  { '1,0': '2', '2,0': '3' },
  {
    '0,1': ['2', '3'],
    '3,1': ['2', '3'],
    '1,2': ['1', '4'],
    '2,2': ['1', '4'],
    '0,3': ['1', '4'],
    '3,3': ['1', '4'],
  },
);

function Sudoku4Demo(): JSX.Element {
  return (
    <Card title="Number puzzle 4 × 4 (boxes 2 × 2, given bold, entries blue, pencil marks)">
      <div className={NUMBER_BOX} data-testid="dev-grid-sudoku4">
        <GridBoard
          size={{ cols: 4, rows: 4 }}
          boxes={{ cols: 2, rows: 2 }}
          cells={SUDOKU4_CELLS}
          label="Number puzzle, 4 by 4"
        />
      </div>
      <p className="mt-2 text-sm text-muted">Bold = given, blue = entered, small = notes.</p>
    </Card>
  );
}

const SUDOKU6_GIVEN = ['1...5.', '.561..', '2..5.4', '.6.3..', '3.2..5', '..53.2'] as const;
const SUDOKU6_CELLS = digitCells(
  SUDOKU6_GIVEN,
  { '1,0': '2', '3,0': '4' },
  {
    '2,0': ['3'],
    '0,1': ['3', '4'],
    '4,1': ['2', '4'],
    '1,2': ['1', '3'],
    '4,2': ['1', '6'],
    '0,3': ['1', '4', '5'],
    '2,3': ['1', '2', '3', '4', '6'],
  },
);

function Sudoku6Demo(): JSX.Element {
  return (
    <Card title="Number puzzle 6 × 6 (boxes 3 × 2, notes up to 3 × 3; not checked for one solution)">
      <div className={NUMBER_BOX} data-testid="dev-grid-sudoku6">
        <GridBoard
          size={{ cols: 6, rows: 6 }}
          boxes={{ cols: 3, rows: 2 }}
          cells={SUDOKU6_CELLS}
          label="Number puzzle, 6 by 6"
        />
      </div>
    </Card>
  );
}

// Picture cross: X shape; every clue is the run lengths of its line.
const CROSS_SIZE = { cols: 5, rows: 5 } as const;
const CROSS_LABELS = {
  top: ['1 1', '1 1', '1', '1 1', '1 1'],
  left: ['1 1', '1 1', '1', '1 1', '1 1'],
} as const;
const CROSS_TONES: readonly NonNullable<GridCellContent['tone']>[] = [
  'neutral',
  'filled',
  'crossed',
];

function PictureCrossDemo(): JSX.Element {
  const [tones, setTones] = useState<
    Readonly<Record<string, NonNullable<GridCellContent['tone']>>>
  >({
    '0,0': 'filled',
    '4,0': 'filled',
    '2,2': 'filled',
    '1,0': 'crossed',
    '2,0': 'crossed',
    '3,0': 'crossed',
    '0,1': 'crossed',
  });

  function cycle(cell: Cell): void {
    const key = cellKey(cell);
    const current = tones[key] ?? 'neutral';
    const next = CROSS_TONES[(CROSS_TONES.indexOf(current) + 1) % CROSS_TONES.length] ?? 'neutral';
    setTones({ ...tones, [key]: next });
  }

  const cells: Record<string, GridCellContent> = {};
  for (const [key, tone] of Object.entries(tones)) cells[key] = { tone };

  return (
    <Card title="Picture cross 5 × 5 (clue lanes, filled / crossed tones, tap to cycle)">
      <div className={NUMBER_BOX} data-testid="dev-grid-cross">
        <GridBoard
          size={CROSS_SIZE}
          edgeLabels={CROSS_LABELS}
          cells={cells}
          onCellTap={cycle}
          label="Picture cross, 5 by 5"
        />
      </div>
      <p className="mt-2 text-sm text-muted">Tap a cell: empty, filled, crossed out.</p>
    </Card>
  );
}

const SELECT_SIZE = { cols: 6, rows: 3 } as const;

function SelectDemo(): JSX.Element {
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);

  function toggle(cell: Cell): void {
    if (checked) return;
    const key = cellKey(cell);
    setPicked(picked.includes(key) ? picked.filter((p) => p !== key) : [...picked, key]);
  }

  // The "right" cells are the even ones (x + y even); checking marks each pick good or bad.
  const isRight = (key: string): boolean => {
    const [x = 0, y = 0] = key.split(',').map(Number);
    return (x + y) % 2 === 0;
  };
  const highlights: Record<string, GridHighlight> = {};
  if (showHint && !checked) highlights['0,0'] = 'hint';
  if (!checked) highlights['5,2'] = 'target';
  for (const key of picked) {
    highlights[key] = checked ? (isRight(key) ? 'good' : 'bad') : 'selected';
  }
  const cells: Record<string, GridCellContent> = { '2,1': { tone: 'crossed' } };

  return (
    <Card title="Tap to select 6 × 3 (target ring, hint, selected, then ✓ / ✕)">
      <div className="mx-auto aspect-[2/1] w-full max-w-[560px]">
        <GridBoard
          size={SELECT_SIZE}
          cells={cells}
          highlights={highlights}
          onCellTap={toggle}
          label="Pick the squares, 6 by 3"
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button
          label="Hint"
          testId="dev-grid-hint"
          onClick={() => {
            setShowHint(!showHint);
          }}
        >
          Hint
        </Button>
        <Button
          label="Check"
          testId="dev-grid-check"
          onClick={() => {
            setChecked(true);
          }}
        >
          Check
        </Button>
        <Button
          label="Start over"
          testId="dev-grid-clear"
          onClick={() => {
            setPicked([]);
            setChecked(false);
            setShowHint(false);
          }}
        >
          Start over
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted">
        Picked: {picked.length === 0 ? 'none' : picked.join(' · ')}. Even cells (x + y even) are
        right.
      </p>
    </Card>
  );
}

export function GridPlayground(): JSX.Element {
  return (
    <main className="min-h-dvh bg-cream p-3 sm:p-6">
      <h1 className="mb-4 font-display text-3xl text-ink">Grid playground (dev only)</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RobotDemo />
        <SudokuDemo />
        <SelectDemo />
        <Sudoku4Demo />
        <Sudoku6Demo />
        <PictureCrossDemo />
      </div>
    </main>
  );
}
