# Logic — curriculum (v1.3: plan, `m14.1`)

Lesson / exercise design for W1–W3 of [plan.md](plan.md) §2. A world's rows are its plan until its iteration lands (`m14.9` W1, `m14.10` W2, `m14.11` W3), then what shipped, with an "as built" table (like `docs/subjects/math/curriculum.md`), plus the content review log (§6).

## 1. Shape

| Item | Rule |
|---|---|
| Track | main `puzzles` ("Puzzle Paths"): W1 `pattern-pond` (habitat `river`), W2 `sort-shore` (`ocean`), W3 `grid-puzzles` (`jungle`) |
| Characters | Owl narrates; Pip the Panda (`panda`) teaches every lesson and is the hub icon's character |
| Ranks | `thinker` (start) → `spotter` (W1) → `sorter` (W2) → `solver` (W3) |
| Lesson (card kinds, W1–W2) | story 2–3 sentences (Owl + Pip, the strategy by name), demo = full worked example, 2 guided, 6 scored, 1 easier variant for the hardest scored item, concept = lesson id |
| Lesson (`grid-fill`, W3) | same, but 2 guided (one target cell each) + 4 scored (whole puzzles, 2–4 min each) |
| Strategy words | the story names the strategy, hint level 2 names it again (plan §1 #1): "find the part that repeats", "check every jump", "what is different?", "one box at a time", "last empty cell", "only place", "only number", "count the runs" |
| Generated | every guided / scored / variant / boss round is a `generate:` entry (§3) with a stored seed, except the authored transitive line-up items (W2) and the picture library (W3, §4) |
| Shapes | card shape tokens (plan L3): kinds circle / square / triangle / star / heart / diamond, colours red / blue / yellow / green / purple / orange, sizes tiny … huge, count 1–9; never red–green, green–orange or blue–purple as the only difference |
| Stars | card kit and `group`: 3 = no error, no hint; 2 = 1 error or hint 1; 1 = otherwise. `grid-fill`: the same rule over the whole puzzle (highest hint level used, errors = rejected entries). Mastery = mean ≥ 2.4 |
| Bosses | one world boss per world (`series`, `tracks.yaml` `boss:`, `unlockAfter` the world's last lesson) |
| Badges | generic `mastered` per world: Pattern Spotter (W1), Shore Sorter (W2), Puzzle Solver (W3) |

## 2. Lessons

### W1 Pattern Pond (patterns) — plan, `m14.9`

| Lesson | Title | Kinds | Guided | Scored (6) | Easier variant |
|---|---|---|---|---|---|
| `pat-repeat` | Repeat | choice | 2 `pat-next` (AB colour; AB kind) | 2 `pat-next` (AAB; ABB) · 2 `pat-gap` (AB; ABC) · 1 `pat-next` ABC · 1 `pat-next` ABC on two attributes (kind + colour) | `pat-next` AB (for the two-attribute item) |
| `pat-steps` | Number steps | number-entry, choice | 2 `step-next` up (step 3; step 4) | 1 `step-next` up (step 6–9) · 1 `step-next` down · 1 `step-next` double · 1 `step-next` alternate · 1 `step-next` grow · 1 `step-rule` | `step-next` up step 2 (for `grow`) |
| `pat-grow` | Growing | choice, number-entry | 2 `grow-next` choice (+1; +2) | 3 `grow-next` choice (one +2 from 3) · 3 `grow-next` entry (ahead 1; ahead 2; ahead 3) | `grow-next` entry ahead 1, +1 (for ahead 3) |
| `pat-far` | Far ahead | choice | 2 `far-term` AB (8th; 10th) | 3 `far-term` AB (9th–20th) · 3 `far-term` ABC (7th–15th) | `far-term` AB 6th (for the last ABC) |

Pattern Train (`pattern-train`, `series`, `errors3: 0`, `errors2: 2`, concept `pat-far`, `unlockAfter: pat-far`, goal "Every carriage follows the pattern. Which one comes next?"): 5 rounds, `pat-next` ABC → `pat-gap` AAB → `step-next` up → `grow-next` choice → `far-term` AB.

Totals: 4 lessons, 8 guided, 24 scored, 4 variants, 5 boss rounds = 41 exercises. Rank `spotter`; badge `pattern-spotter` ("Pattern Spotter": master Pattern Pond and beat Pattern Train).

### W2 Sort Shore (classification, seriation) — plan, `m14.10`

| Lesson | Title | Kinds | Guided | Scored (6) | Easier variant |
|---|---|---|---|---|---|
| `cls-odd` | Odd one out | choice | 2 `odd-one` 3 items (colour; kind) | 4 `odd-one` 4 items (one per attribute: colour, kind, size, count) · 2 `odd-one` 4 items with noise | `odd-one` 3 items (for the second noise item) |
| `cls-rule` | Find the rule | choice | 2 `odd-rule` 3 items (colour; kind) | 4 `odd-rule` 4 items (one per attribute) · 2 `odd-one` 4 items with noise | `odd-rule` 3 items (for the last `odd-rule`) |
| `cls-boxes` | Two boxes | group (row, carroll) | 2 `sort-boxes` (2 boxes, 4 items) | 1 `sort-boxes` 2 boxes 6 items · 1 `sort-boxes` 3 boxes (by kind) · 4 `carroll` (colour × kind; size × kind; colour × size; kind × count) | `sort-boxes` 2 boxes 4 items (for the last `carroll`) |
| `cls-circles` | Circles | group (venn) | 2 `venn` (4 items, no outside; 5 items) | 4 `venn` shape facts (2 with outside items) · 2 `venn` animal facts (§3) | `venn` 4 items, no outside (for the last animal item) |
| `cls-line-up` | Line up | order, choice, true-false | `line-up` size 3 · `line-up` count 4 | 1 `line-up` size 5 · 1 `line-up` count 5 · 4 authored transitive (`lu-*`: tallest, shortest, order 3 animals, true / false) | `line-up` size 3 (for the order of 3 animals) |

Sorting Sprint (`sorting-sprint`, `series`, `errors3: 0`, `errors2: 2`, concept `cls-circles`, `unlockAfter: cls-line-up`, goal "Help Pip sort the shells!"): 5 rounds, `odd-one` → `odd-rule` → `sort-boxes` → `carroll` → `venn`.

Totals: 5 lessons, 10 guided, 30 scored, 5 variants, 5 boss rounds = 50 exercises. Rank `sorter`; badge `shore-sorter`.

### W3 Grid Puzzles (sudoku, picture cross) — plan, `m14.11`

| Lesson | Title | Techniques allowed (plan L9) | Guided (1 target cell) | Scored (4) | Easier variant |
|---|---|---|---|---|---|
| `grd-last` | Last empty cell | last cell | 2 `sdk-last` (row; box) | 4 `sdk-last` (empty 4, 5, 6, 6) | `sdk-last` empty 3 |
| `grd-only-place` | Only place | last cell + only place | 2 `sdk-place` ("Where can the 3 go in this box?") | 4 `sdk-place` (empty 6, 7, 8, 8) | `sdk-place` empty 5 |
| `grd-only-number` | Only number | last cell + only number | 2 `sdk-number` ("Which number fits here?") | 4 `sdk-number` (empty 8, 9, 10, 10) | `sdk-number` empty 7 |
| `grd-six` | Six by six | last cell + only number, 6 × 6 (boxes 2 rows × 3 columns) | 2 `sdk-six` (empty 6; 8) | 4 `sdk-six` (empty 10, 12, 14, 16) | `sdk-six` empty 8 |
| `grd-pixels` | Picture cross | line techniques up to combine | 2 library pictures (full lines only; overlap) | 4 library pictures (cross-out; combine) | library picture, full lines + overlap |

Sudoku Sprint (`sudoku-sprint`, `series`, `errors3: 1`, `errors2: 3`, concept `grd-six`, `unlockAfter: grd-pixels`, goal "Fill the grids, step by step!"): 5 rounds, `sdk-last` → `sdk-place` → `sdk-number` → `sdk-six` empty 8 → `sdk-six` empty 10. One error allowed for 3 stars: ≈ 40 cells in a row; recalibrate after playtests.

Totals: 5 lessons, 10 guided, 20 scored, 5 variants, 5 boss rounds = 40 exercises. Rank `solver`; badge `puzzle-solver`.

All three worlds: 14 lessons, 28 guided, 74 scored, 14 variants, 15 boss rounds = 131 exercises.

## 3. Templates

Code: `packages/subject-logic/src/content/templates/` (`LOGIC_TEMPLATES`); texts `lessons.yaml` `templates.<id>`; tests: every parameter set of §2 over 200 seeds (1 000 in `test:slow`), every `check` broken by hand.

| Template | Kind | Params (levers) | Answer | Checks (template `check` / kind `verify`) | Iteration |
|---|---|---|---|---|---|
| `pat-next` | choice; prompt row of shapes ending in `gap` | `unit` AB / AAB / ABB / ABC, `attr` colour / kind / size / kind + colour, `units` 2–3 shown | next token | every period ≤ shown / 2 that fits the shown terms gives the same answer; 3 options: the right token, another unit token, one token outside the pattern; colour-blind rule | m14.9 |
| `pat-gap` | choice; `gap` inside the row | same | missing token | same; the gap never in the first unit | m14.9 |
| `step-next` | number-entry; card "3, 7, 11, 15, ?" | `family` up / down / double / alternate (+a, +b) / grow (+1, +2, +3, …), `step` 2–9, `start`; ≥ 4 terms (5 for alternate / grow), all ≤ 100, ≥ 0 | next term | exactly one rule family (constant step, × 2, alternating steps, steps growing by a constant) fits the shown terms (1, 2, 4 is rejected); `up` avoids steps 2 / 5 / 10 except the variant (math skip counting) | m14.9 |
| `step-rule` | choice (3 rule texts: "+3 each time" / "× 2 each time" / "+1, +2, +3 …") | `family`, `step` | the family | same; distractors fit the first two terms only | m14.9 |
| `grow-next` | choice (3 clusters) or number-entry; prompt row of clusters (count 1–9) | `mode` choice / entry, `step` 1 / 2, `start` 1–3, `ahead` 1–3 (entry) | next count | shown counts ≤ 9 (cluster limit); entry answer ≤ 30; choice options right / ± step | m14.9 |
| `far-term` | choice (the unit's tokens); prompt row of 1–2 units | `unit` AB / ABC, `position` 6–20, `attr` | token at `position` | position > shown terms; options = unit tokens | m14.9 |
| `odd-one` | choice (3–4 shape items) | `attr` colour / kind / size / count, `items` 3 / 4, `noise` (a second attribute split 2–2) | odd item | per attribute at most one item is unique, and exactly one attribute has a unique item; colour-blind rule | m14.10 |
| `odd-rule` | choice (3 rule texts: "They are all red." …); prompt row of 3–4 shapes | `attr`, `items` 3 / 4 | the shared attribute | exactly one attribute is shared by all items; the other two options name attributes that vary | m14.10 |
| `sort-boxes` | group `row` (2–3 boxes) | `attr`, `boxes` 2 ("red" / "not red") / 3 (one per value), `items` 4–6 | box per item | each item fits exactly one box (shape facts); every box ≥ 1 item | m14.10 |
| `carroll` | group `carroll` (2 × 2) | `axes` two attributes, `items` 4–8 | zone per item | every zone ≥ 1 item; each item fits exactly one zone | m14.10 |
| `venn` | group `venn` | `axes` two shape-fact rules or two animal facts, `items` 4–8, `outside` yes / no | zone per item | as `carroll`; outside may be empty (`allow-empty`) | m14.10 |
| `line-up` | order (3–5 shape items, smallest first) | `by` size / count, `items` 3–5, same kind and colour | order | strict order, no ties | m14.10 |
| `sdk-last` / `sdk-place` / `sdk-number` | grid-fill sudoku 4 × 4 | `empty`, `targets` 1 (guided) | the solution | kind `verify`: one solution, the human solver finishes with the lesson's allowed set (plan L9), the lesson's technique occurs, targets deducible; template: no 4 × 4 grid repeats across lessons (cross-lesson guard) | m14.11 |
| `sdk-six` | grid-fill sudoku 6 × 6 | `empty` (from 7, or more tries at 6: 99.5 % within 200) | the solution | as above; build ≤ 40 ms per item (measured ≤ 2.1 ms mean) | m14.11 |

Animal facts (W2 `venn`, authored table in the template, emoji + tags): 16 animals × `flies`, `swims`, `four-legs`, `farm`; every pair of tags splits them into four non-empty zones.

Reasons (one authored sentence each, spoken when the wrong answer matches; card kit `reasonKey`):

| Bug | Wrong answer | Reason |
|---|---|---|
| `unit-break` | `pat-next` / `pat-gap`: the token that repeats the last one shown | "Say the pattern from the start. Which part repeats?" |
| `first-jump` | `step-next` alternate / grow: the first step added again | "Check every jump, not just the first one." |
| `grow-off` | `grow-next`: one step off | "Look how many more there are each time." |
| `far-off` | `far-term`: the token one place off | "Count in whole units, not one by one." |

`group` wrong drops and `grid-fill` rejected entries get the kind's notes (miss row / column / overlap / outside; conflict in a row / column / box), never digits or coordinates (plan L6).

## 4. Picture library (W3 `grd-pixels`, `m14.11`)

12 authored 5 × 5 pictures (`#.` rows, `reveal` emoji): fish 🐟, cat 🐱, rabbit 🐰, duck 🦆, snail 🐌, turtle 🐢, crab 🦀, owl 🦉, frog 🐸, bee 🐝, snake 🐍, mouse 🐭. Clues computed at compile; `verify`: line-solvable with the item's techniques (full-line → overlap → cross-out → combine), one solution. A picture that fails is redrawn or dropped (≥ 7 needed: 2 guided, 4 scored, 1 variant).

## 5. Voice budget (plan L6: ≤ 230 clips)

| Part | Clips (cap) | Content |
|---|---|---|
| W1 | 55 | 4 lessons (title, story, demo), template sentences, 4 reasons, Pattern Train, hub / Journey / rank / badge lines |
| W2 | 65 | 5 lessons, template sentences, 4 transitive items, Sorting Sprint, `group` kind notes (≈ 12) |
| W3 | 75 | 5 lessons, template sentences, Sudoku Sprint, `grid-fill` notes (≈ 25: conflict per unit kind, hint per technique × unit kind) |
| Slack | 35 | rewording after playtests |

Each iteration reports its clip count; `pnpm voice:check` gates it.

## 6. Content review log

Per CLAUDE.md content rule: every text checked against its board so exactly one reading leads to the accepted answer; no distractor shapes; "the next one" / "the missing one" only with one gap. Checks are logged per world when it ships.

| Check | World | Result |
|---|---|---|
| — | — | (none yet) |
