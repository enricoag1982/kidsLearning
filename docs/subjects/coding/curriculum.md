# Coding — curriculum (World 1 built in `m12.5`, Worlds 2 and 3 in `m12.6`)

What is in `packages/subject-coding/content/` as shipped; the plan and the reasons are in [plan.md](plan.md). Every world has a boss (`tracks.yaml` `boss`); worlds unlock in order, a world counting as mastered once its lessons are mastered and its boss is won.

## 1. Lessons

Main track `basics` ("Coding Basics"); every lesson is taught by the Fox (the Owl narrates), concept id = lesson id. Ranks: `starter` (start) → `stepper` (after `world:meadow-steps`) → `looper` (after `world:looping-hills`) → `turner` (after `world:turning-woods`).

| World (habitat) | Lesson | Title | Concept | Kinds | Guided | Scored | Easier variants | Boss |
|---|---|---|---|---|---|---|---|---|
| `meadow-steps` (meadow) | `seq-order` | Steps in order | steps in the right order | order, choice | 2 order | 4 order + 1 choice | 1 (for `order-04`) | — |
| | `seq-arrows` | Walk the path | one arrow = one step | program, predict | 1 program + 1 predict | 4 program + 2 predict | 1 (for `arrows-04`) | — |
| | `seq-collect` | Collect the stars | plan around rocks, stars on the way | program, predict | 1 program + 1 predict | 4 program + 2 predict | 1 (for `collect-04`) | — |
| | `seq-debug` | Bug hunt | a bug = one wrong step: watch, find, fix | find-bug, program (fix-it) | 2 find-bug | 4 find-bug + 2 program | 1 (for `debug-04`) | Bug Squash (world boss) |
| `looping-hills` (river) | `loop-pattern` | See the pattern | spot the pattern; a Repeat says it shorter | choice, program | 2 choice | 3 choice + 2 program | 1 (for `pattern-05`) | — |
| | `loop-repeat` | Repeat N | one tile, N times in all | program, predict | 1 program + 1 predict | 4 program + 2 predict | 1 (for `repeat-04`) | — |
| | `loop-chunk` | Repeat a chunk | a body of 2–3 tiles (staircase, wave) | program, predict | 1 program + 1 predict | 4 program + 2 predict | 1 (for `chunk-04`) | — |
| | `loop-debug` | Loop bugs | wrong count, wrong tile inside the loop | find-bug, program (fix-it) | 2 find-bug | 4 find-bug + 2 program | 1 (for `loopbug-04`) | Fence Builder (world boss) |
| `turning-woods` (forest) | `turn-facing` | Which way am I facing? | a turn spins Fox on the spot, the heading stays | choice, predict | 2 choice | 3 choice + 2 predict | 1 (for `facing-03`) | — |
| | `turn-build` | Forward and turn | forward + turn left / right from Fox's view | program, predict | 1 program + 1 predict | 4 program + 2 predict | 1 (for `build-04`) | — |
| | `turn-loop` | Turns in loops | repeat [forward, turn] draws a square | program, predict | 1 program + 1 predict | 4 program + 2 predict | 1 (for `tloop-04`) | — |
| | `turn-jump` | Jump the gap | Jump = two cells, over one rock | program, predict | 1 program + 1 predict | 4 program + 2 predict | 1 (for `jump-04`) | — |
| | `turn-debug` | Mirror bugs | left and right swapped, the wrong kind of tile | find-bug, program (fix-it) | 2 find-bug | 4 find-bug + 2 program | 1 (for `tbug-04`) | Left-Right Rescue (world boss) |

Totals: 13 lessons, 26 guided tries, 75 scored exercises, 13 easier variants, 13 boss rounds (127 exercises): World 1 40 (35 + 5), World 2 39 (35 + 4), World 3 48 (44 + 4).

Bosses (all `series`, `errors3: 0`, `errors2: 2`, `unlockAfter` = the world's debugging lesson; lead 2026-10-04: as an optional mini-game a boss was unreachable once its world was done and no warm-up was due, so every world boss is a Journey node, `tracks.yaml` `boss`):

| Boss | World | Concept | Rounds | Skill |
|---|---|---|---|---|
| Bug Squash (`bug-squash`) | 1 | `seq-debug` | 5 find-bug, programs of 3, 4, 5, 6, 6 tiles | debugging |
| Fence Builder (`fence-builder`) | 2 | `loop-chunk` | 4 program, must-loop, caps 6, 4, 3, 3 | loop compression |
| Left-Right Rescue (`left-right-rescue`) | 3 | `turn-build` | 4 program, Fox faces down, left, right, up; 5, 8, 9, 10 tiles | relative turns |

A boss's concept is the lesson whose skill it plays (Fence Builder: a chunk in a Repeat; Left-Right Rescue: build with forward and turns); Bug Squash keeps its debugging lesson. Each boss is a Journey node once all lessons of its world are mastered; it also opens as a Today session mini-game after the world's debugging lesson.

Badges (generic conditions only):

| Badge | Condition | Why |
|---|---|---|
| First Program | `concept-correct` `seq-arrows` ×1 | the first clean program of the first program lesson |
| Bug Squasher | `concept-correct` `seq-debug` ×5 | a mini-game win has no generic condition (and a standalone mini-game is unscored): five clean bug hunts instead |
| Meadow Walker | `mastered` `world:meadow-steps` | all four lessons mastered and Bug Squash won (world mastery includes the world boss) |
| Hill Climber | `mastered` `world:looping-hills` | four lessons mastered and Fence Builder won ("Master Looping Hills and beat Fence Builder") |
| Woods Ranger | `mastered` `world:turning-woods` | five lessons mastered and Left-Right Rescue won ("Master Turning Woods and beat Left-Right Rescue") |

## 2. Rules the build and the tests hold

| Rule | Where |
|---|---|
| W1: absolute arrows only (`up down left right`), no `heading`; every tray holds arrows only | content tests |
| `seq-arrows`: no rocks, no stars, a flag; grids 3 × 3 to 5 × 5; solution 2–5 tiles and a shortest one; `cap` = solution length + 2 | content tests |
| `seq-collect`: 1–3 stars, 1–4 rocks, a flag; solution = the solver's shortest length; `cap` = shortest + 2 (≤ 12) | content tests |
| W1 `seq-debug`: every board has exactly one program of its length that reaches the flag (4^n runs), so exactly one arrow can be the bug; no stars; the bug is the first arrow where Fox leaves the path (build rule) | build + content tests |
| Fix-it (W1, W3): strip starts as the buggy program, `cap` = its length, every slot locked except the bug's; W2 fix-its: same, `cap` = the solution's tile count | content tests |
| Every program exercise has a runnable, non-empty program that fails (the tests' wrong try); an empty strip is not runnable ("Add some tiles first", no error) | build + kind tests |
| W2: tray = the four arrows + Repeat; every program is `must-loop`: the solution has a repeat, `cap` = its tile count (a repeat counts 1 + its body) + 0 or 1 (only `repeat-04` has the 1), and the solver finds no program without a repeat within `cap` (build rule, tested again); grids ≤ 6 × 6, no rocks | build + content tests |
| W2 `loop-debug`: every hunt has exactly one tile whose swap for another arrow (or, for the repeat, for the same repeat with another count) reaches the flag, and it is the bug; a count bug is the repeat tile, a body bug a tile inside it; the first departure of the buggy run from the fixed run is at the bug (build rule) | build + content tests |
| W3: every level sets `heading` (checked in the YAML); tray ⊆ `forward turn-left turn-right jump repeat` (Repeat only in `turn-loop`, Jump only in `turn-jump`), no arrows | content tests |
| W3 programs that are not loops: the solution is a shortest one (solver) and `cap` = shortest + 2 (fix-its: their own length); loops are `must-loop` as in W2 (`cap` = tile count + 0 or 1) | content tests |
| W3 `turn-facing`: each question names the start and 1–3 turns; the right arrow is the heading the simulator gives after those turns from the start the card shows; the four arrows come in the order ↑ → ↓ ← | content tests |
| W3 `turn-jump`: every board is a wall of rocks, so no program without Jump reaches the flag (solver: none within 20 tiles) | content tests |
| W3 `turn-debug`: every hunt has exactly one tile whose swap for forward or a turn reaches the flag, and it is the bug; no stars | content tests |
| Instructions ≤ 12 words; the stars in the text match the board ("the star" / "the stars") | content tests |
| Every narrated note and hint is in the voice inventory (a bump note for every step count a program of the content can reach: 37 with a 6-slot strip and a Repeat, rock and edge) | content tests, `pnpm voice:check` |

## 3. Exercises

Columns: id; kind; grid (columns × rows); the answer (a program is one reference solution; a predict names the square, column, row; a hunt names the tile and its fix); what it practises. Texts: [lessons.yaml](../../../packages/subject-coding/content/locales/en/lessons.yaml).

### `seq-order` — Steps in order

| id | kind | cards | answer | practises |
|---|---|---|---|---|
| `order-g1` (guided) | order | 3 | dig a hole → plant the seed → water it | first order, "tap the first step first" |
| `order-g2` (guided) | order | 3 | write → envelope → mailbox | a second everyday plan |
| `order-01` | order | 3 | bread → cheese → eat | order matters |
| `order-02` | order | 4 | socks → shoes → laces → run outside | a longer plan (the lesson's sock-before-shoe rule) |
| `order-03` | order | 3 | toothpaste → brush → rinse | everyday routine |
| `order-04` | order | 4 | mix → shape on a tray → bake → eat | the hardest order (easier: `order-e1`) |
| `order-05` | choice | 3 options | the snowball (snowman: nose and hat need a snowman) | which step is first |
| `order-e1` (easier) | order | 3 | mix → bake → eat | `order-04` in 3 cards |

### `seq-arrows` — Walk the path

| id | kind | grid | answer | practises |
|---|---|---|---|---|
| `arrows-g1` (guided) | program | 3 × 3 | right, down (2 tiles, tray right + down, cap 4) | first Run |
| `arrows-g2` (guided) | predict | 3 × 3 | right, down → (2, 3), not the flag | follow 2 arrows |
| `arrows-01` | program | 3 × 3 | down, down, right (cap 5) | read left to right |
| `arrows-02` | program | 4 × 4 | up, up, left, left (cap 6) | up and left arrows, 6-slot strip |
| `arrows-03` | program | 4 × 4 | up, up, up, right, right (cap 7) | 5 tiles |
| `arrows-04` | program | 5 × 5 | down, down, down, left, left (cap 7) | the hardest (easier: `arrows-e1`) |
| `arrows-05` | predict | 4 × 3 | down, right, right → (3, 2), not the flag | follow 3 arrows |
| `arrows-06` | predict | 4 × 4 | right, down, down, right → (4, 4), the flag | follow 4 arrows |
| `arrows-e1` (easier) | program | 3 × 3 | down, down, left (cap 5) | `arrows-04` in 3 tiles |

### `seq-collect` — Collect the stars

| id | kind | grid | answer | practises |
|---|---|---|---|---|
| `collect-g1` (guided) | program | 3 × 3, 1 star, 1 rock | right, right, down, down (cap 6) | step on a star |
| `collect-g2` (guided) | predict | 3 × 3, 1 star, 1 rock | down, right, right → (3, 2): passes the star | a star does not stop Fox |
| `collect-01` | program | 3 × 3, 1 star, 1 rock | right, down, right, down (cap 6) | one star |
| `collect-02` | program | 4 × 4, 2 stars, 2 rocks | down, right, down, down, right, right (cap 8) | a wall of rocks, 2 stars |
| `collect-03` | program | 4 × 4, 2 stars, 3 rocks | right, right, down, right, down, down (cap 8) | rocks that force the route |
| `collect-04` | program | 5 × 5, 3 stars, 4 rocks | down, right ×4 alternating, 8 tiles (cap 10) | the hardest (easier: `collect-e1`) |
| `collect-05` | predict | 4 × 4, 1 star, 1 rock | down, right, down, right → (3, 3) | pick up a star on the way |
| `collect-06` | predict | 4 × 4, 2 stars, 2 rocks | right, right, down, down → (3, 3): on a star | stops on a star |
| `collect-e1` (easier) | program | 4 × 3, 1 star, 1 rock | right ×3, down, down (cap 7) | `collect-04` with one star |

### `seq-debug` — Bug hunt

Every board is a path of rocks to the flag (no stars); `bug` = the arrow where Fox first leaves the path.

| id | kind | grid | program → bug (tile: arrow → fix) | practises |
|---|---|---|---|---|
| `debug-g1` (guided) | find-bug | 3 × 3 | up, down, right → tile 1 up → down (Fox hits the edge) | watch, find, tap |
| `debug-g2` (guided) | find-bug | 3 × 3 | left, down, up → tile 3 up → down (Fox walks back) | bug in the last tile |
| `debug-01` | find-bug | 4 × 3 | down, right, right, down → tile 4 down → right | last tile |
| `debug-02` | find-bug | 4 × 3 | left, right, right, down → tile 1 left → right (edge) | first tile |
| `debug-03` | find-bug | 4 × 4 | down, right, up, down, right → tile 3 up → down (rock) | middle tile, 5 tiles |
| `debug-04` | find-bug | 4 × 4 | right, right, down, left, left, left → tile 4 left → down (rock) | 6 tiles (easier: `debug-e1`) |
| `debug-05` | program (fix-it) | 4 × 3 | strip left, up, up, up; slots 1, 3, 4 locked; solution left, left, up, up | swap tile 2 |
| `debug-06` | program (fix-it) | 5 × 4 | strip right, right, up, down, up; slots 1, 2, 3, 5 locked; solution right, right, up, up, up | swap tile 4 |
| `debug-e1` (easier) | find-bug | 3 × 3 | down, left, left → tile 2 left → down (rock) | `debug-04` in 3 tiles |

### Bug Squash — 5 rounds of find-bug, rising length

| id | grid | program → bug | tiles |
|---|---|---|---|
| `bug-squash-r1` | 4 × 3 | up, up, up → tile 2 up → right | 3 |
| `bug-squash-r2` | 4 × 4 | up, up, up, up → tile 3 up → left | 4 |
| `bug-squash-r3` | 4 × 4 | up, right, right, up, down → tile 4 up → down | 5 |
| `bug-squash-r4` | 4 × 4 | up, up, up, right, left, right → tile 5 left → right | 6 |
| `bug-squash-r5` | 4 × 4 | left, up, left, up, up, right → tile 2 up → left | 6 |

### `loop-pattern` — See the pattern

Choice cards are big text (`🔁 4 × →` against a row of arrows); no emoji picture, no narrated card text. The two programs are the first Repeat blocks a child builds (text: "Reach the flag! Tap Repeat, an arrow, then the number.").

| id | kind | grid | answer | practises |
|---|---|---|---|---|
| `pattern-g1` (guided) | choice | — | `→ → → →` = 🔁 4 × → (other card: 3 ×) | a row of 4 = a repeat of 4 |
| `pattern-g2` (guided) | choice | — | `↓ ↓ ↓` = 🔁 3 × ↓ (others: → and 2 ×) | the arrow counts too |
| `pattern-01` | choice | — | `→ ×5` = 🔁 5 × → (others: 4 ×, ←) | count the row |
| `pattern-02` | choice | — | `↑ ×4` = 🔁 4 × ↑ (others: ↓, 3 ×) | the right arrow |
| `pattern-03` | choice | — | `← ×6` = 🔁 6 × ← (others: →, 5 ×) | a longer row |
| `pattern-04` | program | 6 × 3 | repeat 5 [right] (cap 2) | the first Repeat: tray, arrow inside, count |
| `pattern-05` | program | 3 × 5 | repeat 4 [down], right (cap 3) | a corner after the loop (easier: `pattern-e1`) |
| `pattern-e1` (easier) | program | 3 × 4 | repeat 3 [down] (cap 2) | `pattern-05` without the corner |

### `loop-repeat` — Repeat N

No stars and no rocks: the flag only. Straight runs of 3–5 (a 6 × 6 grid holds 5 steps in a row) with at most one corner tile after the loop.

| id | kind | grid | answer | practises |
|---|---|---|---|---|
| `repeat-g1` (guided) | program | 5 × 3 | repeat 4 [right] (cap 2) | count the squares, set the number |
| `repeat-g2` (guided) | predict | 4 × 3 | repeat 3 [right] → (4, 1), not the flag | follow a repeat |
| `repeat-01` | program | 3 × 5 | repeat 4 [down] (cap 2) | a vertical run |
| `repeat-02` | program | 5 × 3 | repeat 4 [right], down (cap 3) | a corner after the loop |
| `repeat-03` | program | 4 × 6 | repeat 5 [down], left (cap 3) | the longest run, a corner |
| `repeat-04` | program | 6 × 3 | repeat 5 [right], up (cap 4) | one slot to spare (easier: `repeat-e1`) |
| `repeat-05` | predict | 4 × 4 | repeat 3 [down], right → (2, 4), not the flag | a loop, then a tile |
| `repeat-06` | predict | 6 × 3 | repeat 5 [right], up → (6, 2), the flag | a long loop |
| `repeat-e1` (easier) | program | 4 × 4 | repeat 3 [right], up (cap 3) | `repeat-04` with a shorter run |

### `loop-chunk` — Repeat a chunk

Stars sit on the steps; the loop picks up every one.

| id | kind | grid | answer | practises |
|---|---|---|---|---|
| `chunk-g1` (guided) | program | 3 × 3, 1 star | repeat 2 [right, down] (cap 3) | a 2-tile body, a staircase |
| `chunk-g2` (guided) | predict | 4 × 4 | repeat 2 [down, right] → (3, 3), not the flag | follow a chunk twice |
| `chunk-01` | program | 4 × 4, 2 stars | repeat 3 [right, up] (cap 3) | staircase up and right |
| `chunk-02` | program | 4 × 4, 2 stars | repeat 3 [down, left] (cap 3) | staircase down and left |
| `chunk-03` | program | 5 × 3, 2 stars | repeat 2 [right, right, down] (cap 4) | a 3-tile body, long steps |
| `chunk-04` | program | 4 × 3, 2 stars | repeat 3 [down, right, up] (cap 4) | a wave: the body goes back (easier: `chunk-e1`) |
| `chunk-05` | predict | 4 × 4 | repeat 2 [right, up] → (3, 2), not the flag | follow a chunk |
| `chunk-06` | predict | 4 × 4 | repeat 3 [right, up] → (4, 1), the flag | three rounds |
| `chunk-e1` (easier) | program | 3 × 3, 1 star | repeat 2 [down, right] (cap 3) | `chunk-04` as a plain staircase |

### `loop-debug` — Loop bugs

No stars, no rocks. `bug` = `[top]` (the repeat tile, fix = the same repeat with the right count) or `[top, body]` (a tile inside it). Each hunt was checked by swapping every tile for every other arrow (a repeat for itself with 2–9): only the bug's swap reaches the flag.

| id | kind | grid | program → bug (tile: tile → fix) | practises |
|---|---|---|---|---|
| `loopbug-g1` (guided) | find-bug | 5 × 3 | repeat 3 [right] → tile 1: count 3 → 4 (Fox stops short) | wrong count |
| `loopbug-g2` (guided) | find-bug | 4 × 4 | repeat 3 [right, up] → tile 3: up → down (edge) | wrong tile inside the loop |
| `loopbug-01` | find-bug | 5 × 3 | repeat 5 [right] → tile 1: count 5 → 4 (edge) | a count that is too big |
| `loopbug-02` | find-bug | 4 × 4 | repeat 3 [right, down] → tile 2: right → left (edge) | the first tile of the body |
| `loopbug-03` | find-bug | 3 × 5 | repeat 3 [down], right → tile 1: count 3 → 4 | the count, a corner after |
| `loopbug-04` | find-bug | 5 × 3 | repeat 2 [right, left, down] → tile 3: left → right | a 3-tile body (easier: `loopbug-e1`) |
| `loopbug-05` | program (fix-it) | 5 × 3 | strip repeat 4 [right], up; slot 1 locked; solution repeat 4 [right], down (cap 3) | swap the arrow after the loop |
| `loopbug-06` | program (fix-it) | 2 × 5 | strip left, repeat 4 [down]; slot 2 locked; solution right, repeat 4 [down] (cap 3) | swap the arrow before the loop |
| `loopbug-e1` (easier) | find-bug | 3 × 3 | repeat 2 [right, up] → tile 3: up → down | `loopbug-04` in 2 tiles |

The fix-its keep the repeat locked and fix a plain arrow: a wrong repeat cannot be rebuilt by the e2e driver (the strip has no way to take a whole repeat out), and the count and body bugs are the six hunts' job.

### Fence Builder — 4 rounds of program, must-loop, fewer slots each

The stars are the fence posts (2–3 per board); without them a repeat-free program would fit round 1.

| id | grid | answer | cap | shortest without a repeat |
|---|---|---|---|---|
| `fence-builder-r1` | 5 × 4, 2 stars | repeat 4 [right], repeat 3 [down], repeat 2 [left] | 6 | 9 |
| `fence-builder-r2` | 6 × 5, 2 stars | repeat 5 [right], repeat 4 [up] | 4 | 9 |
| `fence-builder-r3` | 6 × 2, 2 stars | repeat 5 [right], down | 3 | 6 |
| `fence-builder-r4` | 5 × 5, 3 stars | repeat 4 [right, up] | 3 | 8 |

### `turn-facing` — Which way am I facing?

No program: the card on the board shows Fox and the way it faces now (`🦊` over a big arrow); the instruction names the turns ("Fox faces down. Turn right, turn right, turn right. Which way now?"); the four answers are big arrows in the fixed order ↑ → ↓ ←. The heading chip of the grid shows on the two predictions.

| id | kind | start → turns → answer | practises |
|---|---|---|---|
| `facing-g1` (guided) | choice | up → turn right → right | one turn |
| `facing-g2` (guided) | choice | up → turn right ×2 → down | two turns |
| `facing-01` | choice | right → turn left → up | a left turn |
| `facing-02` | choice | down → turn right ×3 → right | three turns |
| `facing-03` | choice | left → right, left, left → down | mixed turns (easier: `facing-e1`) |
| `facing-04` | predict | 4 × 4, up: forward, turn left, forward, forward → (1, 2), the flag | the square, not the heading |
| `facing-05` | predict | 4 × 4, left: forward ×2, turn right, forward ×2 → (2, 2), not the flag | turn in the middle |
| `facing-e1` (easier) | choice | left → turn right → up | `facing-03` in one turn |

### `turn-build` — Forward and turn

Every level sets `heading`. Facing down and left, Fox's own left is not the screen's left (`build-02`, `build-03` need turn left to go down and right).

| id | kind | grid, heading | answer | practises |
|---|---|---|---|---|
| `build-g1` (guided) | program | 3 × 3, right | turn right, forward, forward (cap 5) | the first turn |
| `build-g2` (guided) | predict | 3 × 3, up | forward ×2, turn right, forward → (2, 1), not the flag | turn, then walk |
| `build-01` | program | 3 × 3, up | forward, turn left, forward ×2 (cap 6) | an L, facing up |
| `build-02` | program | 3 × 3, left | forward ×2, turn left, forward ×2 (cap 7) | facing left: turn left goes down |
| `build-03` | program | 3 × 4, down | forward ×3, turn left, forward ×2 (cap 8) | facing down: turn left goes right |
| `build-04` | program | 4 × 3, right, 2 rocks | forward, turn right, forward ×2, turn left, forward ×2 (cap 9) | two turns round a wall (easier: `build-e1`) |
| `build-05` | predict | 4 × 4, up | forward, turn left, forward ×2 → (1, 2), the flag | follow turns |
| `build-06` | predict | 4 × 4, left | forward ×2, turn right, forward ×2 → (2, 2), not the flag | facing left |
| `build-e1` (easier) | program | 3 × 3, right | forward, turn right, forward ×2 (cap 6) | `build-04` as an L |

### `turn-loop` — Turns in loops

Stars at the corners; every program is a repeat of one pass (`must-loop`, `cap` = tile count).

| id | kind | grid, heading | answer | practises |
|---|---|---|---|---|
| `tloop-g1` (guided) | program | 3 × 3, right, 2 stars | repeat 3 [forward, turn right] (cap 3) | a square with 1-cell sides |
| `tloop-g2` (guided) | predict | 3 × 3, right | repeat 2 [forward, turn right] → (2, 2), not the flag | two sides of the square |
| `tloop-01` | program | 3 × 3, right, 2 stars | repeat 3 [forward ×2, turn right] (cap 4) | a square with 2-cell sides |
| `tloop-02` | program | 4 × 4, right, 2 stars | repeat 3 [forward, turn right, forward, turn left] (cap 5) | a zigzag |
| `tloop-03` | program | 4 × 4, right, 2 stars | repeat 3 [forward ×3, turn right] (cap 5) | a square with 3-cell sides |
| `tloop-04` | program | 4 × 4, up, 2 stars | repeat 3 [forward ×3, turn left] (cap 5) | the other way round (easier: `tloop-e1`) |
| `tloop-05` | predict | 4 × 4, right | repeat 2 [forward, turn right, forward, turn left] → (3, 3), not the flag | a zigzag |
| `tloop-06` | predict | 4 × 4, up | repeat 2 [forward ×2, turn right] → (3, 2), the flag | two sides |
| `tloop-e1` (easier) | program | 2 × 2, down, 2 stars | repeat 3 [forward, turn left] (cap 3) | `tloop-04` on a 2 × 2 board |

### `turn-jump` — Jump the gap

Every board is a wall of rocks that no walk goes round: the solver finds no program without Jump (checked). `cap` = shortest + 2.

| id | kind | grid, heading | answer | practises |
|---|---|---|---|---|
| `jump-g1` (guided) | program | 5 × 3, right, 3 rocks | forward, jump, forward (cap 5) | the first jump |
| `jump-g2` (guided) | predict | 5 × 3, right, 1 rock | forward, jump → (4, 2), not the flag | where a jump lands |
| `jump-01` | program | 3 × 4, down, 3 rocks | forward, jump (cap 4) | a wall across |
| `jump-02` | program | 5 × 3, up, 5 rocks | jump, turn right, jump, jump (cap 6) | jump, turn, jump twice |
| `jump-03` | program | 5 × 4, left, 4 rocks | jump, turn left, forward, jump (cap 6) | a turn after the wall |
| `jump-04` | program | 5 × 5, right, 7 rocks | forward, jump, forward, turn right, jump, jump (cap 8) | two walls (easier: `jump-e1`) |
| `jump-05` | predict | 5 × 3, right, 1 rock | forward, jump, forward → (5, 2), not the flag | land, then walk |
| `jump-06` | predict | 5 × 3, right, 1 star | jump, forward → (4, 2), not the flag; the star under the jump stays | the jumped-over cell is not visited |
| `jump-e1` (easier) | program | 5 × 3, right, 3 rocks | forward, jump, turn right, forward (cap 6) | `jump-04` with one wall |

### `turn-debug` — Mirror bugs

No stars. Each hunt was checked by swapping every tile for forward and each turn: only the bug's swap reaches the flag.

| id | kind | grid, heading | program → bug (tile: tile → fix) | practises |
|---|---|---|---|---|
| `tbug-g1` (guided) | find-bug | 3 × 3, up | forward ×2, turn left, forward ×2 → tile 3: turn left → turn right (edge) | left and right swapped |
| `tbug-g2` (guided) | find-bug | 3 × 3, right | forward ×5 → tile 3: forward → turn right (edge) | a missing turn |
| `tbug-01` | find-bug | 4 × 4, up | forward ×2, turn left, forward ×3 → tile 3: turn left → turn right | swapped turn |
| `tbug-02` | find-bug | 4 × 4, down | forward ×3, turn right, forward ×3 → tile 4: turn right → turn left | facing down, the swap that heads right |
| `tbug-03` | find-bug | 3 × 3, right | forward ×2, turn right, turn left, forward → tile 4: turn left → forward | a turn where Fox should walk |
| `tbug-04` | find-bug | 4 × 3, right, 2 rocks | forward, turn right, forward ×2, turn right, forward ×2 → tile 5: turn right → turn left | a late swap (easier: `tbug-e1`) |
| `tbug-05` | program (fix-it) | 3 × 3, left | strip forward ×2, turn right, forward ×2; slot 3 open; solution turn left (cap 5) | swap one turn |
| `tbug-06` | program (fix-it) | 3 × 4, down | strip forward ×3, turn right, forward ×2; slot 4 open; solution turn left (cap 6) | the swap that heads right |
| `tbug-e1` (easier) | find-bug | 3 × 3, right | turn left, forward ×2 → tile 1: turn left → turn right | `tbug-04` in 3 tiles |

### Left-Right Rescue — 4 rounds of program, Fox faces down, left, right, up

Relative tiles only (no Repeat): `cap` = shortest + 2. The stars are the friends to rescue.

| id | grid, heading | answer | cap |
|---|---|---|---|
| `rescue-r1` | 4 × 3, down, 1 star | forward ×2, turn left, forward ×2 (5 tiles) | 7 |
| `rescue-r2` | 5 × 3, left, 2 stars | forward ×2, turn left, forward ×2, turn right, forward ×2 (8) | 10 |
| `rescue-r3` | 5 × 4, right, 2 stars | forward ×2, turn right, forward ×3, turn left, forward ×2 (9) | 11 |
| `rescue-r4` | 5 × 4, up, 3 stars | turn left, forward ×2, turn right, forward ×3, turn right, forward ×2 (10) | 12 |

## 4. Content review log

CLAUDE.md rule: every question text is checked against its board / cards so exactly one reading leads to the accepted answer; no distractor items; "up" said once.

| Check | What was checked | Result |
|---|---|---|
| 1 | `seq-order` orders (7 incl. the easier one): each plan has one sensible order (socks before shoes before laces before running; paste before brush before rinse; mix before shape before bake before eat); every card has a picture and a label, no two cards of an exercise share a picture | ok |
| 2 | `order-05` "Which step comes first?": the prompt names the plan (snowman); the nose and the hat need a snowman, so only the snowball can be first | ok |
| 3 | `seq-arrows` programs: the board has Fox and the flag only (no rock, no star), the text names the one goal "Help Fox reach the flag."; "up" is said once, in the story ("Up goes towards the top of the screen") | ok |
| 4 | `seq-arrows` predicts "Where will Fox stop? Tap the square.": the flag is on the board, so one of three predictions ends on it and two do not (the flag is no tell); arrows read left to right, no bump | ok |
| 5 | `seq-collect` programs: the text counts the stars on the board ("the star" with 1, "the stars" with 2–3); rocks are introduced in the story ("rocks block Fox's way"); every solution is a solver-shortest program | ok |
| 6 | `seq-collect` predicts: each path steps on a star; two stop on an empty square, one on a star, so a star is no tell either | ok |
| 7 | `seq-debug` hunts "One arrow is wrong. Tap it!": exhaustive check of every board (4^n programs): exactly one program of that length reaches the flag, so exactly one arrow differs from it; the bug is the first arrow where Fox leaves the path; the board has rocks and the flag only | ok |
| 8 | `seq-debug` fix-its "Swap the wrong arrow for the right one, then Run.": the same single way through; only the bug's slot is open | ok |
| 9 | Bug Squash: 5 hunts, programs of 3, 4, 5, 6, 6 tiles, bug at tiles 2, 3, 4, 5, 2; each board has one way through | ok |
| 10 | Wording: every instruction ≤ 12 words; the two guided find-bug tries add "Press Watch."; no "closest to you" / "bottom row" wording needed (the cards and arrows name everything) | ok |
| 11 | Voice: every note and hint text, and a bump note for every step count up to 10 (the longest `cap`), is in the inventory | ok |
| 12 | Pictures use emoji from the older sets only (no emoji newer than 2018), so older tablets draw them | ok |
| 13 | `loop-pattern` choices "Which repeat makes the same walk?": each row of arrows has exactly one card with its count and arrow; every other card is one step off (count ± 1 or the other arrow); the row is plain arrows, the cards big text only; the right card is not always in the same place | ok |
| 14 | W2 programs: the build's must-loop rule (solver over every board) finds no program without a repeat within `cap`; `cap` = the loop's tile count (+ 1 on `repeat-04` only); the repeat count is the number of squares to cross (3–5) | ok |
| 15 | `loop-debug` hunts "One tile is wrong. Tap it!": every tile swapped for every other arrow (the repeat for 2–9 times): exactly one swap, the bug's, reaches the flag; the count bug is the repeat tile, the body bug the tile inside it; no stars | ok |
| 16 | `loop-debug` fix-its: the repeat stays locked, the arrow beside it is the one open slot; the buggy strip fails | ok |
| 17 | Fence Builder: the stars are the posts (a board without them fits round 1 without a repeat); a repeat-free program needs 9, 9, 6, 8 tiles for caps 6, 4, 3, 3 | ok |
| 18 | `turn-facing` questions: the instruction names the start and the turns, the card shows Fox and the same start arrow, the answer is the heading the simulator gives; "Left and right are Fox's own left and right — look where Fox is facing!" is in the story; four arrows in a fixed order | ok |
| 19 | W3 levels: every one sets `heading` (YAML); `turn-build` starts up, left, down, right; non-loop solutions are solver-shortest and `cap` = shortest + 2; predictions run to their end without a bump | ok |
| 20 | `turn-jump`: every board is a wall, the solver finds no program without Jump; `jump-06`: the star under the jump is not collected, so the tap is the landing square only | ok |
| 21 | `turn-debug` hunts: every tile swapped for forward and each turn: exactly one swap, the bug's, reaches the flag; the kinds of bug are a left / right swap, a turn where Fox should walk and forward where a turn belongs | ok |
| 22 | Left-Right Rescue: Fox faces down, left, right, up; routes of 5, 8, 9, 10 tiles for 1, 2, 2, 3 stars; the text says "the star" with one star, "the stars" with more | ok |
| 23 | Wording W2 / W3: every instruction ≤ 12 words; the first Repeat program says how to build one; the Jump try says "Jump over the rocks!"; "tile" (not "arrow") where the bug can be a repeat or a turn | ok |
| 24 | Voice: every new text and a bump note for every step count up to 37 (a 6-slot strip with a repeat runs 37 steps at most), rock and edge, is in the inventory | ok |
| 25 | Pictures W2 / W3: 🔁 ⬛ 🦊 🚩 and the plain arrows ← ↑ → ↓ (no emoji newer than 2018) | ok |

Manual checks still open (owner, `docs/release.md` §1): the picture cards on the iPad / Android tablet; a child's first run of `seq-arrows` (placement declined).
