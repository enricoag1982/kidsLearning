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

Full map: 7 worlds, 35 lessons (patterns, sorting, spatial, mazes, grid puzzles, deduction, planning). v1.3 = three worlds (14 lessons; lesson-level list in [curriculum.md](curriculum.md)):

| World | Lessons (concept id) | Kinds | Boss |
|---|---|---|---|
| W1 Pattern Pond | `pat-repeat` repeating unit (AB, AAB, ABC) · `pat-steps` number rules (constant step, ×2, alternating, growing step) · `pat-grow` growing figures · `pat-far` "the 10th one" | choice (shape cards), number-entry | Pattern Train (series) |
| W2 Sort Shore | `cls-odd` odd one out · `cls-rule` find the rule · `cls-boxes` two boxes (Carroll 2 × 2) · `cls-circles` Venn · `cls-line-up` order by size (A > B, B > C ⇒ A > C) | choice, group, order | Sorting Sprint (series) |
| W3 Grid Puzzles | `grd-last` last empty cell (4 × 4 sudoku) · `grd-only-place` · `grd-only-number` · `grd-six` 6 × 6 · `grd-pixels` picture cross 5 × 5 | grid-fill | Sudoku Sprint (series) |

Next versions: Mirror Meadow (spatial), Maze Mountain, Clue Cove (true / false, logic grid, owls & foxes), Plan Ahead (Hanoi, river crossing, Nim with two equal piles, tic-tac-toe vs bot).

## 3. Exercise kinds

| Kind | Owner | Interaction | Check | Hints 1 / 2 / 3 |
|---|---|---|---|---|
| `choice`, `order`, `number-entry`, `true-false` | platform card kit | Cards with drawn shape tokens (kind × colour × size × count) | exact; content checks: every rule that fits the shown terms gives the same answer (pattern ambiguity), one odd item per attribute | card kit |
| `group` | platform (opt-in, like `duel`) | Tap a card, tap a box (row of 2–4 boxes, Carroll 2 × 2, Venn) | each item fits exactly one zone (rules over shape facts + tags) | box rules / rule out a wrong box / place one |
| `grid-fill` | logic | Tap a cell, tap a number (sudoku) or fill / cross (picture cross); pencil marks | exactly one solution; a human-style solver finishes with the lesson's allowed techniques (L9), and the lesson's technique occurs | per step: highlight the unit(s) / name the technique and point at the cell (no candidates: a naked single's candidate is the answer) / fill the cell |

## 4. Decisions (lead 2026-10-04, from a code read of the platform after M13)

| # | Decision | Why |
|---|---|---|
| L1 | Patterns, odd-one-out, sorting and sudoku are `generate:` templates (M13 G1–G4); sudoku solve checks live in the `grid-fill` kind's `verify` (authored puzzles get them too); template `check` covers template rules (empty cells, the target technique occurs); never reseed a released stem | one pipeline; snapshot + voice unchanged |
| L2 | Picture cross from an authored library (~12 animal pictures as `#.` rows); clues computed at compile; `verify` proves line-solvable | random 5 × 5 pictures look like noise |
| L3 | Shape tokens in the card kit (`CardItem.shape`, `CardPrompt.shapes` with one `gap`); colour-blind rule (red–green, green–orange, blue–purple never the only difference) | emoji have no sizes and differ per platform |
| L4 | `group` is a platform kind, opt-in (not in `CARD_KINDS`) | math can reuse it (odd / even); other subjects' snapshots unchanged |
| L5 | `grid-fill` is one logic kind with a rules registry (`sudoku`, `picture-cross`); a wrong entry is rejected with a reason (conflicting row / column / box); the hint ladder restarts at each step (`stepHint`), stars from the highest level used | multi-cell puzzles need step hints |
| L6 | Voice budget ≤ 230 clips (≈ 3 MB; 17.5 of 25 MB used after M13): one fixed sentence per template variant, grid notes worded by technique only (no digits / coordinates), transitive "taller than" items authored | audio budget |
| L7 | Nim / tic-tac-toe move to v1.4 (Plan Ahead); tic-tac-toe needs a draw-aware `duel` (game value win / draw / loss); one-pile Nim = Race to 20, so logic Nim uses two equal piles | scope |
| L8 | `subject-logic` stays out of the app until W1 plays (`m14.9` registers it) | master deploys on every push |
| L9 | Sudoku techniques are an allowed set per lesson, not a level hierarchy (`LESSON_TECHNIQUES`): last cell; last cell + only place; last cell + only number; 6 × 6 = last cell + only number. A generated puzzle uses the lesson's technique at least once and nothing outside its set (m14.6, 2026-10-04) | exhaustive check of all 4 × 4 grids × clue sets: when "only place" is allowed, "only number" is never needed (6 × 6: 1 in 200), so a level ladder cannot produce "only number" puzzles |

Authored: stories, art, wording, transitive line-up items, the picture library.

## 5. Platform needs

| Need | Where | Reused by |
|---|---|---|
| Shape tokens (L3) | platform card kit (core, content, web) | Math (patterns, `groups` picture) |
| `group` kind (L4) | platform card kit, opt-in | Math (sort: odd / even, shapes) |
| `GridBoard` puzzle props: thick box borders, pencil marks, given vs entry style, clue lanes on the edges | platform-web `ui/grid` | — |
| Generated exercises, reasons, card voice (M13) | platform | — |

## 6. Iterations (M14)

Re-cut 2026-10-04 (one concern per iteration, ≤ 4 commits):

| Tag | Scope |
|---|---|
| `m14.1` | This plan + `curriculum.md` |
| `m14.2` | Card-kit shape tokens |
| `m14.3` | Platform `group` kind (opt-in) |
| `m14.4` | `GridBoard` puzzle props |
| `m14.5` | `subject-logic` skeleton (math layout, not registered) |
| `m14.6` | Pure solvers: sudoku model / counter / generator, human-style solver, picture-cross line solver |
| `m14.7` | `grid-fill` core + content |
| `m14.8` | `grid-fill` web |
| `m14.9` | W1 Pattern Pond + Pattern Train; Logic registered in the app |
| `m14.10` | W2 Sort Shore + Sorting Sprint |
| `m14.11` | W3 Grid Puzzles + Sudoku Sprint |
| `m14.12` | Prompt-less card choice layout (follow-up F15, found in the `m14.10` visual pass): options fill the board slot as large tiles |
| `m14.13` | Release `v1.3.0` |
