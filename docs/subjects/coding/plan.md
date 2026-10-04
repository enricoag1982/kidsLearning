# Coding — plan (v1.1, milestone M12)

Target: age 8–9 beginners (extension 10–11). Sources: [research.md](research.md) (2026-10-04: code.org CS Fundamentals C–E, ScratchJr / Coding as Another Language (Bers), Lightbot, Kodable, CS Unplugged, Barefoot, Bebras, UK KS2 computing, CSTA 1B, PRIMM; web pages read through search summaries only). Claims marked `(bg)` there need a check before use in parent-facing text.

## 1. Principles

| # | Principle | Source |
|---|---|---|
| 1 | Sequence first; debugging from lesson 1 (a bug is normal, never a fail) | code.org C, CAL, debugging study (8–9, transfers) |
| 2 | Read before write: predict, run, then build (PRIMM) | PRIMM |
| 3 | Each construct answers a felt pain: loop after long repeats; condition after a program that fails on another board; function after a repeated chunk | lead decision |
| 4 | One new tile per lesson; tray ≤ 8 tiles; program strip ≤ 12 slots, no scrolling | Kodetu, block-overload reports |
| 5 | Absolute arrows (W1–W2), relative turns from W3 (heading arrow, the animal's paw highlighted, turn animated in place) | code.org maze, Bee-Bot frame studies |
| 6 | Efficiency = slot cap, not a star penalty; optimal length = badge | "stars for fewest blocks punish learners" |
| 7 | Execution visible: ~0.7 s per step, current tile glows, loop badge "2 of 3", bump = soft sound + ghost path + "bumped at step 4" | code.org maze |

Concept order: sequence → debug → repeat N → relative turns + loop → events → nested loop → if / else on a sensor → while / until → functions (no parameters). Too early at 8–9: variables, parameters, and / or / not, nested conditionals, recursion.

Lesson loop mapping: Story = hook; Demo = predict, then watch; guided tries = investigate / modify; scored = make; boss = free make.

## 2. Curriculum

v1.1 = W1–W3 (13 lessons, ≈ 3 h). W4–W7 (events, nested loops, if / while, functions: 16 lessons) = v1.4+. Extension W8–W9 (variables, parameters, boolean logic) = 10–11.

| World | Lesson (concept id) | Child learns | Kinds | Boss |
|---|---|---|---|---|
| W1 Meadow Steps (arrows) | `seq-order` | An algorithm = exact steps; order matters (picture cards) | order, choice | — |
| | `seq-arrows` | One arrow = one step; read left to right | program, predict | — |
| | `seq-collect` | Plan around rocks; "pick up" is a step | program, predict | — |
| | `seq-debug` | A bug = one wrong step: find, fix | find-bug, program (fix) | Bug Squash |
| W2 Looping Hills (repeat N) | `loop-pattern` | Spot the repeating chunk | choice (pattern cards), program | — |
| | `loop-repeat` | One tile, N times | program (cap), predict | — |
| | `loop-chunk` | A body of 2–3 tiles (staircase) | program (cap), predict | — |
| | `loop-debug` | Wrong count, wrong chunk | find-bug, predict | Fence Builder |
| W3 Turning Woods (relative) | `turn-facing` | Turn = rotate in place; heading stays | predict, choice | — |
| | `turn-build` | Forward + turn left / right from the animal's view | program, predict | — |
| | `turn-loop` | repeat [forward, turn] (squares, zigzags) | program (cap) | — |
| | `turn-jump` | Jump = over one rock | program, predict | — |
| | `turn-debug` | Left / right swapped, missing turn | find-bug, program (fix) | Left-Right Rescue |

## 3. Exercise kinds

| Kind | Owner | Interaction | Check (content build) | Hints 1 / 2 / 3 |
|---|---|---|---|---|
| `program` | coding | Drag / tap tiles from the tray into slots (some prefilled or locked: "fix" and "fill the gap" variants); Run | Simulator reaches the goal (all stars picked), no bump, ≤ slot cap; loop lessons: no loop-free program fits the cap (search) | which way first? / ghost of the next tile / demo then rebuild |
| `predict` | coding | Read-only program; tap the end square | Simulator | run the first 2 steps / step to where the tap diverges / full run |
| `find-bug` | coding | Program fails; tap the wrong tile | Exactly one tile differs from a passing program; accepted = the first tile that leaves the goal path | slow replay to the departure / grey out all but 3 / flash it |
| `order` | platform (card kit) | Tap picture cards into order | Authored order | card kit |
| `choice` | platform (card kit) | Pick the program card that does it (card shows a tiny program) | Simulator: exactly one option passes | card kit |

Stars: 3 = no hint, no error (error = failed run / wrong tap); 2 = 1 error or hint 1; 1 = otherwise.

Tiles: W1 `up` `down` `left` `right` `pick` · W2 `repeat(n){…}` · W3 `forward` `turn-left` `turn-right` `jump`. Grid ≤ 6 × 6; tray ≤ 8; strip ≤ 12; repeat body ≤ 4; nesting none in v1.1.

## 4. Mini-games (series bosses over the kinds)

| Boss | Skill | Rounds |
|---|---|---|
| Bug Squash | debugging | 5 find-bug rounds, rising length |
| Fence Builder | loop compression | 4 program rounds, must-loop, cap 6 → 4 → 3 → 3 (lead 2026-10-04: a cap must rule out every loop-free program on a ≤ 6 × 6 grid) |
| Left-Right Rescue | relative turns | 4 program rounds, the animal faces down / left / right first |

## 5. Platform needs

| Need | Where | Reused by |
|---|---|---|
| Generic grid board: N × M cells, walls / rocks, stars, goal, an actor with heading, footprint trail, tap a cell, accessible cell names | platform-web `ui/grid/` (+ core types) | Logic (mazes, squares, sudoku), Math (arrays) |
| `order`, `choice` card kinds | platform (`m11.7`) | all |
| Program editor (tray, slots, repeat block, Run / Step / Reset, execution animation) | coding pack | — |
| Simulator + solver (BFS over programs ≤ cap) | coding core | content checks, hints, e2e solutions |

## 6. Iterations (M12)

| Tag | Scope |
|---|---|
| `m12.1` | This plan + research notes (`research.md`) |
| `m12.2` | Platform grid board (`ui/grid`) + core grid types; chess untouched. Done: `GridBoard` + `domain/grid.ts` + dev `#grid` playground (dev builds only) |
| `m12.3` | `packages/subject-coding` (scaffold, not yet registered in the app); core: tiles, simulator, solver; kinds `program`, `predict`, `find-bug` (engine, solution, content, verify). Done: stars are collected by entering their cell (no pick tile); success judged at the end of the program; content rules incl. `must-loop` (no loop-free program fits the cap), find-bug = first departure; fixture world + series boss; solver worst case ≈ 20 ms |
| `m12.4` | Web: program editor + run animation, kind UIs, pack; e2e drivers. Done: tap-first strip / tray (repeat = C-block with count badge), run animation (0.7 s per step, none with reduced motion) before the engine scores, notes (bumped / edge / not there yet / fill the gaps), hints (first cell, ghost tiles, reveal), dev `#coding` playground, App-flow test |
| `m12.5` | W1 content (4 lessons) + Bug Squash; registered in the app (hub tile); voice; e2e lesson spec; `curriculum.md` (lesson / exercise list). Done: Bug Squash = World 1 boss (Journey node; an optional mini-game was unreachable after W1); badges on generic conditions (First Program = first correct `seq-arrows`, Bug Squasher = 5 clean bug hunts, Meadow Walker = world mastered); every world boss = the world's series (W2 Fence Builder, W3 Left-Right Rescue) |
| `m12.6` | W2–W3 content (9 lessons) + 2 bosses; release `v1.1.0` (owner checks) |

## 7. Risks

| Risk | Mitigation |
|---|---|
| Drag-and-drop on small tablets | Tap-to-add as the primary input (tap a tray tile → next free slot; tap a slot → remove); drag optional |
| Left / right confusion | Paw highlight + "your animal's left" narration + `turn-facing` lesson |
| Content ambiguity (two valid end squares, two bugs) | Simulator checks in the build: unique answer, single mutation |
| Difficulty spikes (Lightbot) | One new tile per lesson; ≥ 3 easy items before any cap |
