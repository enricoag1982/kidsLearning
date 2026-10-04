# Coding — curriculum (World 1 built in `m12.5`)

What is in `packages/subject-coding/content/` as shipped; the plan and the reasons are in [plan.md](plan.md). W2 (Looping Hills) and W3 (Turning Woods) come with `m12.6`: they are in `tracks.yaml` now as worlds without a lesson ("Coming soon" on the Journey).

## 1. Lessons

Main track `basics` ("Coding Basics"), world `meadow-steps` (habitat `meadow`); every lesson is taught by the Fox (the Owl narrates), concept id = lesson id. Ranks: `starter` (start) → `stepper` (after `world:meadow-steps`).

| Lesson | Title | Concept | Kinds | Guided | Scored | Easier variants | Boss |
|---|---|---|---|---|---|---|---|
| `seq-order` | Steps in order | steps in the right order | order, choice | 2 order | 4 order + 1 choice | 1 (for `order-04`) | — |
| `seq-arrows` | Walk the path | one arrow = one step | program, predict | 1 program + 1 predict | 4 program + 2 predict | 1 (for `arrows-04`) | — |
| `seq-collect` | Collect the stars | plan around rocks, stars on the way | program, predict | 1 program + 1 predict | 4 program + 2 predict | 1 (for `collect-04`) | — |
| `seq-debug` | Bug hunt | a bug = one wrong step: watch, find, fix | find-bug, program (fix-it) | 2 find-bug | 4 find-bug + 2 program | 1 (for `debug-04`) | Bug Squash (optional) |

Totals: 4 lessons, 8 guided tries, 23 scored exercises, 4 easier variants, 5 boss rounds (40 exercises).

Bug Squash (`bug-squash`, `series`, concept `seq-debug`, `unlockAfter: seq-debug`, `errors3: 0`, `errors2: 2`) is an optional mini-game: no world boss (`tracks.yaml`), no lesson boss. The child meets it as the mini-game of a Today session once `seq-debug` is done (`pickSessionMiniGame`); card-kit subjects have no Play screen.

Badges (generic conditions only):

| Badge | Condition | Why |
|---|---|---|
| First Program | `concept-correct` `seq-arrows` ×1 | the first clean program of the first program lesson |
| Bug Squasher | `concept-correct` `seq-debug` ×5 | a mini-game win has no generic condition (and a standalone mini-game is unscored): five clean bug hunts instead |
| Meadow Walker | `mastered` `world:meadow-steps` | all four lessons mastered (no world boss) |

## 2. Rules the build and the tests hold

| Rule | Where |
|---|---|
| Absolute arrows only (`up down left right`), no `heading`; every tray holds arrows only | content tests |
| `seq-arrows`: no rocks, no stars, a flag; grids 3 × 3 to 5 × 5; solution 2–5 tiles and a shortest one; `cap` = solution length + 2 | content tests |
| `seq-collect`: 1–3 stars, 1–4 rocks, a flag; solution = the solver's shortest length; `cap` = shortest + 2 (≤ 12) | content tests |
| `seq-debug`: every board has exactly one program of its length that reaches the flag (4^n runs), so exactly one arrow can be the bug; no stars; the bug is the first arrow where Fox leaves the path (build rule) | build + content tests |
| Fix-it: strip starts as the buggy program, `cap` = its length, every slot locked except the bug's | content tests |
| Every program exercise has a runnable, non-empty program that fails (the tests' wrong try); an empty strip is not runnable ("Add some tiles first", no error) | build + kind tests |
| Instructions ≤ 12 words; the stars in the text match the board ("the star" / "the stars") | content tests |
| Every narrated note and hint is in the voice inventory (a bump note for every step count a program of the content can reach) | content tests, `pnpm voice:check` |

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

Manual checks still open (owner, `docs/release.md` §1): the picture cards on the iPad / Android tablet; a child's first run of `seq-arrows` (placement declined).
