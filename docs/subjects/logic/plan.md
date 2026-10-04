# Logic & puzzles — plan (v1.3, milestone M14)

Target: age 8–9 beginners (Piaget concrete-operational: classification, seriation, concrete if–then, 2D rotation), extension 10–11. Sources: [research.md](research.md) (2026-10-04: Bebras, Kangourou / Math Kangaroo, SmartGames, Goswami, Markovits, Hawes / Uttal spatial training, Hanoi development, working-memory norms, Dignath & Büttner strategy training, Sala & Gobet / Simons on transfer). Figures read through search summaries.

## 1. Principles

| # | Principle | App rule |
|---|---|---|
| 1 | Teach a strategy, then practise ("explain, then practise", d ≈ 0.6) | Story names the strategy; Demo shows it; hint level 2 names it again |
| 2 | Working memory ≈ 3–4 items | ≤ 3 live clues; notes stay on screen (✓ / ✗, crossed-out candidates); replay a clue by tap |
| 3 | Concrete before abstract | Pictures and animals, not symbols; story framing |
| 4 | Mirror ≠ turn | Separate lessons; mirror after turn |
| 5 | Honest claims | "Practises reasoning strategies", never "makes you smarter" (far transfer is weak) |
| 6 | No trial-and-error passes | 3 stars need no error; discrete, snap-to-grid input; free undo |

## 2. Curriculum

Full map: 7 worlds, 35 lessons (patterns, sorting, spatial, mazes, grid puzzles, deduction, planning). v1.3 = three worlds:

| World | Lessons (concept id) | Kinds | Boss |
|---|---|---|---|
| W1 Pattern Pond | `pat-repeat` repeating unit (AB, AAB, ABC) · `pat-steps` number steps · `pat-grow` growing figures · `pat-far` "the 10th one" | choice (shape / emoji cards), number-entry | Pattern Train (series) |
| W2 Sort Shore | `cls-odd` odd one out · `cls-rule` find the rule · `cls-boxes` two boxes (Carroll 2 × 2) · `cls-circles` Venn · `cls-line-up` order by size (A > B, B > C ⇒ A > C) | choice, group, order | Sorting Sprint (series) |
| W3 Grid Puzzles | `grd-last` last empty cell (4 × 4 sudoku) · `grd-only-place` · `grd-only-number` · `grd-six` 6 × 6 · `grd-pixels` picture cross 5 × 5 | grid-fill | Sudoku Sprint (series) |

Next versions: Mirror Meadow (spatial), Maze Mountain, Clue Cove (true / false, logic grid, owls & foxes), Plan Ahead (Hanoi, river crossing, Nim, tic-tac-toe vs bot).

## 3. Exercise kinds

| Kind | Owner | Interaction | Check | Hints 1 / 2 / 3 |
|---|---|---|---|---|
| `choice`, `order`, `number-entry`, `true-false` | platform card kit | Cards; shape tokens (shape × colour × size × count) | exact; content checks: every rule that fits the shown terms gives the same answer (pattern ambiguity), one odd item per attribute | card kit |
| `group` | platform (new, generic) | Tap a card, tap a box (2–4 boxes: Carroll / Venn zones) | each item fits exactly one zone predicate | show the box rules / remove sorted items / place one |
| `grid-fill` | logic | Tap a cell, tap a number (sudoku) or fill / cross (picture cross); pencil marks | solver: exactly one solution; human-style solver: technique per step ≤ lesson level | highlight the unit with progress / name the technique + candidates / fill the cell |

## 4. Generated puzzles

Sudoku 4 × 4 / 6 × 6: random full grid, remove clues while the solution stays unique; rate by the hardest technique needed (last cell → hidden single → naked single); the lesson's technique must occur. Picture cross 5 × 5: animal pictures, line-solvable (no guessing). Patterns / odd-one-out: rule + attribute-table generator with ambiguity checks. Authored: stories, art, wording.

## 5. Platform needs

| Need | Where | Reused by |
|---|---|---|
| Shape tokens in card items (`shape: { kind, colour, size, count }`, drawn as SVG) | platform card kit | Math (patterns, data) |
| `group` kind | platform (core, content, web) | Math (sort: odd / even, shapes) |
| Grid board (from M12) + cell input | platform-web `ui/grid` | — |
| Generated exercises (from M13) | platform-content | — |

## 6. Iterations (M14)

| Tag | Scope |
|---|---|
| `m14.1` | This plan + `docs/subjects/logic/curriculum.md`; subject skeleton (scaffold) |
| `m14.2` | Platform: shape tokens + `group` kind |
| `m14.3` | Logic `grid-fill` kind + sudoku / picture-cross generators and solvers |
| `m14.4` | W1 + W2 content + bosses |
| `m14.5` | W3 content + boss; release `v1.3.0` |
