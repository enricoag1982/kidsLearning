# Logic — curriculum (v1.3: plan `m14.1`, W1 shipped `m14.9`)

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

### W1 Pattern Pond (patterns) — shipped in `m14.9`

`packages/subject-logic/content/`: `lessons/pattern-pond/<lesson>.yaml`, `minigames/pattern-train.yaml`, `tracks.yaml`, `badges.yaml`, texts in `locales/en/` (`journey.yaml`, `rewards.yaml`, `common.yaml` `topic.puzzle` = "Puzzler", `lessons.yaml`: the lessons' title / story / demo, `templates.*`, `bugs.*`). Track `puzzles` ("Puzzle Paths"), world `pattern-pond` ("Pattern Pond", habitat `river`, order 1, boss `pattern-train`). Pip the Panda teaches every lesson (the first Journey node is "Pip the Puzzler", the others show their titles); concept id = lesson id; every guided / scored / variant exercise and every boss round is a `generate:` entry (§3) with a stored seed, so every instruction is a generated text (`lessons:gen.<id>.text`). Seeds are frozen (`src/content/pattern-pond.test.ts`): never change one.

| Lesson | Title | Kinds | Guided | Scored (6) | Easier variant |
|---|---|---|---|---|---|
| `pat-repeat` | Repeat | choice | `rep-g-colour` `pat-next` AB colour · `rep-g-kind` `pat-next` AB kind, 3 units (7-8 tokens) | `rep-aab` `pat-next` AAB colour · `rep-abb` `pat-next` ABB kind · `rep-gap-ab` `pat-gap` AB size, 3 units · `rep-gap-abc` `pat-gap` ABC colour · `rep-abc` `pat-next` ABC kind · `rep-two` `pat-next` ABC kind + colour | `rep-easy` `pat-next` AB colour, 3 units (for `rep-two-1`) |
| `pat-steps` | Number steps | number-entry, choice | `steps-g3` `step-next` up 3 · `steps-g4` `step-next` up 4 | `steps-up` up 6-9 · `steps-down` down · `steps-double` · `steps-alt` alternate · `steps-grow` grow · `steps-rule` `step-rule` alternate | `steps-easy` `step-next` up 2 (for `steps-grow-1`) |
| `pat-grow` | Growing | choice, number-entry | `grow-g1` `grow-next` choice +1 · `grow-g2` choice +2 | `grow-plus1` ×2 choice +1 · `grow-plus2` choice +2 · `grow-e1` entry +1 ahead 1 · `grow-e2` entry +1 ahead 2 · `grow-e3` entry +2 ahead 3 | `grow-easy` entry +1 ahead 1 (for `grow-e3-1`) |
| `pat-far` | Far ahead | choice | `far-g8` `far-term` AB colour 8th · `far-g10` AB colour 10th | `far-ab-1` AB colour 9th-12th · `far-ab-2` AB kind 13th-16th · `far-ab-3` AB kind + colour 17th-20th · `far-abc-1` ABC colour 7th-9th · `far-abc-2` ABC kind 10th-12th · `far-abc-3` ABC kind + colour 13th-15th | `far-easy` AB colour 6th (for `far-abc-3-1`) |

Pattern Train (`pattern-train`, `series`, `errors3: 0`, `errors2: 2`, concept `pat-far`, `unlockAfter: pat-far`, title "Pattern Train", goal "Every carriage follows the pattern. Which one comes next?"): 5 rounds, `train-next` `pat-next` ABC colour → `train-gap` `pat-gap` AAB kind → `train-steps` `step-next` up → `train-grow` `grow-next` choice +1 → `train-far` `far-term` AB colour 9th-20th. It is the world boss on the Journey once the four lessons are done.

Ranks `thinker` (start, "Thinker") → `spotter` (after `world:pattern-pond`, "Pattern Spotter"). Badges: `pattern-spotter` ("Pattern Spotter": `mastered` `world:pattern-pond`, "Master Pattern Pond and beat Pattern Train"), `star-collector` (`stars-total` 10 / 30, generic). The `m14.5` fixture lesson `fx-first`, its badge `first-lesson` and `scripts/content-root.ts` are gone (`minigames/` exists).

Totals: 4 lessons, 8 guided, 24 scored, 4 easier variants, 5 boss rounds = 41 exercises (every one generated); 49 new voice clips (budget 55). Stories and demos are the curriculum's (Pip names the strategy: "find the part that repeats", "check every jump", "count how many more there are each time", "count in whole parts"); the four demo cards are authored rows (`pat-repeat` red circle / blue square, `pat-steps` "3 7 11 15 ?", `pat-grow` yellow stars 1, 3, 5, `pat-far` red / blue circles).

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

### W1 templates as built (`m14.9`)

Code: `packages/subject-logic/src/content/templates/` (`pattern`, `steps`, `grow`, `far`, shared `shapes` / `items` / `bugs` / `draw`, `index` = `LOGIC_TEMPLATES`); texts `lessons.yaml` `templates.<id>` (`grow-next-choice` / `grow-next-entry` for the two modes, `rule-step` / `rule-double` / `rule-alt` / `rule-grow` for the `step-rule` cards) and `bugs.<id>`. Tests run every parameter set of §2 over 200 seeds (1 000 in `w1.slow.test.ts`, `pnpm test:slow`), solve each item again from its own card with independent solvers (`templates/solvers.ts`), and break every `check` by hand (`templates/pattern|steps|grow|far.test.ts`); `registry.test.ts` lists the 6 templates and their texts; `src/content/pattern-pond.test.ts` holds the shipped content to the curriculum and re-derives the content review (§6) from the compiled cards.

| Item | As built | Why |
|---|---|---|
| `step-next` / `step-rule` card | terms separated by single spaces: "3 7 11 15 ?" (the demo too), not "3, 7, 11, 15, ?" | a card's `big` holds 16 characters; five two-digit terms with commas and the "?" are 21, with spaces 16 |
| `pat-next` / `pat-gap` units | `units` 3 is dropped to 2 when the row would pass 8 tokens (AAB / ABB / ABC with 3 units); guided `rep-g-kind`, `rep-gap-ab` and the variant use `units: 3` on AB | more rows to read for the beginner; 8 tokens is the kit's limit |
| Palettes | colours never hold a confusable pair at all (stricter than the kit's rule, which only looks at pairs that differ in colour alone); a square never shares an exercise with a diamond; sizes tiny / medium / huge only; `size` patterns keep kind and colour | a pair of look-alike tokens pulls the eye (CLAUDE.md content rule); the 5 sizes are too close to tell in a row |
| `pat-next` / `pat-gap` options | the right token, the token just before the gap when it is wrong (else another token of the unit), and one token outside the pattern (none for `size` with 3 values); `unit-break` sits on the token before the gap only | spec: the option equal to the last shown token; with AAB / ABB it can be the right one, then no reason |
| `step-next` reasons | `first-jump` for `alternate` only when last + first jump is wrong (it is the answer in `alternate`: no reason there), always for `grow` | a reason on the right answer would never be spoken |
| `step-rule` | distractors are drawn from 4 kinds of rule (constant step, doubling, growing steps, two steps) that fit the first two terms only; the lesson uses `alternate` | `down` is not a rule family here (spec); `alternate` makes the longest rule texts, so it is the hardest, last scored item |
| `grow-next` choice +2 | always starts at 1 (counts 1, 3, 5, options 5, 7, 9): right + step must stay within 9; the demo, `grow-g2` and `grow-plus2` therefore show the same counts in different shapes | spec: all options 1-9 and counts <= 9 |
| `grow-next` entry | `answer` = the count at step 3 + `ahead` (step 4 to 6, at most 13), the sentence "How many in step n?" names n; reasons: the counts one step off | spec; the cap 30 is never reached by W1 (kept in the `check`) |
| `far-term` option ids | `p<n>-a`, `p<n>-b`, `p<n>-c`: the place n is part of the ids | the generated sentence is not visible to `check`, which needs n to see that it is beyond the row |
| `far-term` ranges | the lesson climbs in three steps per unit (AB 9-12, 13-16, 17-20; ABC 7-9, 10-12, 13-15), one entry each | spec "9th-20th" / "7th-15th" over three items; the last ABC is its own entry so it alone carries `easier` |
| Lesson scored order | `pat-grow` choice items first (+1, +1, +2), then entries (ahead 1, 2, 3); `pat-steps` ends with the `step-rule` card | "one +2 from 3" read as one of the three choice items; difficulty climbs inside each kind |
| Easier variant of `rep-two` | `pat-next` AB on one attribute (colour), 3 units shown | the spec names AB; one attribute makes it simpler |
| Seeds | one script drew the candidates; chosen per lesson so that the first tokens differ and the answer card cycles through the 3 places | variety on the screen, the answer is not always the same card (`pattern-pond.test.ts` W1.9) |
| `ShapeRow` (platform-web) | one line, never wraps: every box is square with the side `min(4rem, (row width - gaps) / tokens)` (compact 2.25 rem), set through a custom property; the "?" of the gap shrinks with the row | 8 tokens wrapped on a 390 px phone (`m14.2` note); no container units (iOS 15) |

Animal facts (W2 `venn`, authored table in the template, emoji + tags): 16 animals × `flies`, `swims`, `four-legs`, `farm`; every pair of tags splits them into four non-empty zones.

Reasons (one authored sentence each, spoken when the wrong answer matches; card kit `reasonKey`):

| Bug | Wrong answer | Reason |
|---|---|---|
| `unit-break` | `pat-next` / `pat-gap`: the token that repeats the last one shown | "Say the pattern from the start. Which part repeats?" |
| `first-jump` | `step-next` alternate / grow: the first step added again | "Check every jump, not just the first one." |
| `grow-off` | `grow-next`: one step off | "Look how many more there are each time." |
| `far-off` | `far-term`: the token one place off | "Count in whole parts, not one by one." |

`group` wrong drops and `grid-fill` rejected entries get the kind's notes (miss row / column / overlap / outside; conflict in a row / column / box), never digits or coordinates (plan L6).

## 4. Picture library (W3 `grd-pixels`, `m14.11`)

12 authored 5 × 5 pictures (`#.` rows, `reveal` emoji): fish 🐟, cat 🐱, rabbit 🐰, duck 🦆, snail 🐌, turtle 🐢, crab 🦀, owl 🦉, frog 🐸, bee 🐝, snake 🐍, mouse 🐭. Clues computed at compile; `verify`: line-solvable with the item's techniques (full-line → overlap → cross-out → combine), one solution. A picture that fails is redrawn or dropped (≥ 7 needed: 2 guided, 4 scored, 1 variant).

## 5. Voice budget (plan L6: ≤ 230 clips)

| Part | Clips (cap) | Content |
|---|---|---|
| W1 | 55 (49 used, `m14.9`) | 4 lessons (title, story, demo), template sentences, 4 reasons, Pattern Train, hub / Journey / rank / badge lines |
| W2 | 65 | 5 lessons, template sentences, 4 transitive items, Sorting Sprint, `group` kind notes (≈ 12) |
| W3 | 75 | 5 lessons, template sentences, Sudoku Sprint, `grid-fill` notes (≈ 25: conflict per unit kind, hint per technique × unit kind) |
| Slack | 35 | rewording after playtests |

Each iteration reports its clip count; `pnpm voice:check` gates it.

## 6. Content review log

Per CLAUDE.md content rule: every text checked against its board so exactly one reading leads to the accepted answer; no distractor shapes; "the next one" / "the missing one" only with one gap. Checks are logged per world when it ships.

| Check | World | Result |
|---|---|---|
| W1.1 | W1 | Pattern rows ("What comes next?" / "What is missing?", 11 items: `pat-repeat` 9, Pattern Train 2): one gap, last or inside the row; exactly one of 3 different cards completes the row as a repeating pattern (period up to half the row), and it is the answer; re-derived from the compiled cards | ok |
| W1.2 | W1 | No distractor shapes: a pattern changes one attribute (kind and colour together in `rep-two`), no count, sizes only tiny / medium / huge, at most one option outside the pattern | ok |
| W1.3 | W1 | Number rows ("What number comes next?", 9 items): 4 terms (5 for `alternate` / `grow`) of 0-99, exactly one rule family (constant step, whole ratio, two steps, growing steps) makes them and it makes the answer (<= 100); 1, 2, 4 would fit three | ok |
| W1.4 | W1 | Rule cards ("Which rule makes these numbers?", `steps-rule-1`): exactly one of 3 rules makes every number and it is the answer, the two others make the first two terms only, each card says what its id says | ok |
| W1.5 | W1 | Growing pictures (10 items): 3 clusters of one shape (counts <= 9) growing by a constant step; the 3 cards are right and one step either side (1-9), the entry sentence names the step (4-6) and the answer is that step's count | ok |
| W1.6 | W1 | Far places ("Which shape is number 12?", 10 items): the row is 2 whole parts, the place is beyond it, the cards are the part's tokens, counting in whole parts gives the answer, the reason sits on the token a place before or after | ok |
| W1.7 | W1 | The four demos agree with their cards (red circle, blue square -> blue square; 3 7 11 15 -> 19; 1, 3, 5 stars -> 7; red / blue circles, number 10 is blue) | ok |
| W1.8 | W1 | Look-alikes (31 items with shapes): no two tokens of one exercise differ only in a confusable colour (red-green, green-orange, blue-purple), no square with a diamond | ok |
| W1.9 | W1 | The answer takes every place: among the 21 choices of 3 cards each place holds it at least 3 times | ok |
| W1.10 | W1 | Voice: every story, demo, instruction, reason and the Pattern Train goal are in the inventory with generated audio (`pnpm voice:check`: 49 clips added, none removed); the `step-rule` cards are on the card only, not narrated | ok |
| W1.11 | W1 | Visual pass on the production build, 1024 x 768 and 390 x 844 (hub, Logic Home, Journey, every template, the unit-break and first-jump reasons, Pattern Train): every shape row on one line with square boxes (8 tokens at 390 px too), no horizontal scroll. Not logic content, listed: the 4th hub tile wraps under the other three and is cut at 768 px; a 5-term number row wraps to two lines on a phone (the pad narrows the card); the `step-rule` text cards are small on a phone and 70 px wide on a 1024 x 768 tablet | ok (3 platform items listed) |
