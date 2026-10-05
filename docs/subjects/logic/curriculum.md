# Logic — curriculum (v1.3: plan `m14.1`, W1 shipped `m14.9`, W2 shipped `m14.10`)

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

### W2 Sort Shore (classification, seriation) — shipped in `m14.10`

`packages/subject-logic/content/`: `lessons/sort-shore/<lesson>.yaml`, `minigames/sorting-sprint.yaml`, `tracks.yaml` (world `sort-shore`, "Sort Shore", habitat `ocean`, order 2, boss `sorting-sprint`; rank `sorter`), `badges.yaml`, texts as in W1 (`lessons.yaml`: the lessons' title / story / demo, `templates.*`, the four authored `lu-*` items). The platform's `group` kind is opted in for logic (`docs/adding-a-subject.md` §8: core, content, web and e2e registries). Pip the Panda teaches every lesson; concept id = lesson id; every exercise is a `generate:` entry (§3) with a stored seed except the four authored `lu-*` clue items. Seeds are frozen (`src/content/sort-shore.test.ts`): never change one.

| Lesson | Title | Kinds | Guided | Scored (6) | Easier variant |
|---|---|---|---|---|---|
| `cls-odd` | Odd one out | choice | `odd-g-colour` colour · `odd-g-kind` kind (3 cards) | `odd-colour` · `odd-kind` · `odd-size` · `odd-count` (4 cards) · `odd-noise-a` size · `odd-noise-b` colour (4 cards, noise) | `odd-easy` kind, 3 cards (for `odd-noise-b-1`) |
| `cls-rule` | Find the rule | choice | `rule-g-colour` · `rule-g-kind` (`odd-rule`, 3 cards) | `rule-colour` · `rule-kind` · `rule-size` · `rule-last` size (`odd-rule`, 4 cards) · `rule-noise-a` kind · `rule-noise-b` count (`odd-one`, 4 cards, noise) | `rule-easy` size, 3 cards (for `rule-last-1`) |
| `cls-boxes` | Two boxes | group (row, carroll) | `box-g-colour` · `box-g-kind` (2 boxes, 4 cards) | `box-two` size, 6 cards · `box-three` kind, 3 boxes, 5 cards · `car-colour-kind` (5) · `car-size-kind` (6) · `car-colour-size` (6) · `car-kind-count` (7) | `box-easy` size, 2 boxes, 4 cards (for `car-kind-count-1`) |
| `cls-circles` | Circles | group (venn) | `venn-g-a` 4 cards, no outside · `venn-g-b` 5 cards, outside | `venn-s1` 5 no outside · `venn-s2` 6 outside · `venn-s3` 7 no outside · `venn-s4` 7 outside (shapes) · `venn-an-a` 6 · `venn-an-b` 7 (animals, outside) | `venn-easy` shapes, 4 cards, no outside (for `venn-an-b-1`) |
| `cls-line-up` | Line up | order, choice, true-false | `lu-g-size` 3 cards · `lu-g-count` 4 cards | `lu-size-5` · `lu-count-5` · authored `lu-tallest` · `lu-shortest` · `lu-order` · `lu-true` | `lu-easy` size, 3 cards (for `lu-order`) |

Sorting Sprint (`sorting-sprint`, `series`, `errors3: 0`, `errors2: 2`, concept `cls-circles`, `unlockAfter: cls-line-up`, title "Sorting Sprint", goal "Help Pip sort the shells!"): 5 rounds, `sprint-odd` `odd-one` colour, 4 cards, noise → `sprint-rule` `odd-rule` kind, 4 cards → `sprint-boxes` `sort-boxes` colour, 2 boxes, 5 cards → `sprint-carroll` `carroll` colour × kind, 6 cards → `sprint-venn` `venn` shapes, 6 cards, outside. It is the world boss on the Journey once the five lessons are done.

Ranks `sorter` (after `world:sort-shore`, "Shore Sorter"); badge `shore-sorter` ("Shore Sorter": `mastered` `world:sort-shore`, "Master Sort Shore and beat Sorting Sprint").

Totals: 5 lessons, 10 guided, 30 scored, 5 easier variants, 5 boss rounds = 50 exercises (46 generated, 4 authored); 41 new voice clips (budget 65). Stories and demos are the plan's (Pip names the strategy: "check the colour, the shape, the size and how many", "check one thing at a time", "check the card against the rule", "a card that fits both goes in the middle", "compare two at a time"); the five demo cards are authored rows (three blue circles and a blue square; a small red circle, a big red square, a medium red star; a big red circle; a big blue square; tiny, medium, huge green triangles).

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

### W2 templates as built (`m14.10`)

Code: `packages/subject-logic/src/content/templates/` (`classify` = attributes, palettes, tokens and word refs; `odd` = `odd-one`, `odd-rule`; `sorting` = `sort-boxes`, `carroll`, `venn`; `animals` = the table; `lineup`; registered in `index` = `LOGIC_TEMPLATES`). Texts `lessons.yaml` `templates.<id>` (one fixed sentence each, `line-up-size` / `line-up-count` for the two line-ups) and the word tables `templates.label|not|same.<attribute>-<value>` ("Red", "Not red", "They are all red."; counts and the four animal facts too), which the group boxes / axes and the rule options reference directly (no per-item generated text). Tests: `odd|sorting|lineup.test.ts` run every parameter set of `solvers-w2.ts` (`*_SETS`: `odd-one` 4 attributes × 3 cards / 4 cards / 4 cards with noise; `odd-rule` 3 attributes × 3 / 4 cards; `sort-boxes` 3 attributes × 2 / 3 boxes × 4-6 cards; `carroll` the 12 ordered attribute pairs × 4-8 cards; `venn` shapes / animals × 4-8 cards × outside / not; `line-up` size / count × 3-5 cards) over 200 seeds (1 000 in `w2.slow.test.ts`), solve each item again from its own cards, rules and sentences (own fact reader, own copy of the animal table) and break every `check` by hand; `registry.test.ts` lists the 12 templates and their texts; `src/content/sort-shore.test.ts` holds the shipped content to the curriculum (frozen spec, kinds, easier variants, wording) and re-derives §6 W2.1-W2.10 from the compiled cards.

| Item | As built | Why |
|---|---|---|
| `carroll` axes | any two of colour / kind / size / count (the lesson's fourth table is `kind × count`); `odd-rule`, `sort-boxes` and the shape `venn` use colour / kind / size only | the §2 lesson list names `kind × count`, the §3 template list only colour / kind / size |
| Sizes | tiny / medium / huge in every sorting card, odd-one card and rule row ("Tiny", "They are all tiny."), never small / big; a size axis names an end ("Tiny" or "Huge"), never "Medium"; `line-up` size: 3 cards = tiny, medium, huge, 4 leave one of the five out, 5 use all five; counts 1-6 at least 2 apart (`odd-one`, the count axis), `line-up` count 1-9 | the 5 sizes are too close to tell in a row (W1); "Small / Not small" beside medium cards is an arguable edge; the `cls-rule` demo keeps the authored small / big / medium |
| Third attribute | `sort-boxes`, `carroll` and the shape `venn`: one attribute that no rule names varies on the cards (3 values), every card of an exercise is different | the zone that fits both rules holds one card otherwise, and 8 cards need 4 zones × 2 |
| `sort-boxes` | 2 boxes: ids `yes` / `no`, rules `all` / `none` of one fact ("Red" / "Not red"); 3 boxes: ids = the three values, one `all` rule each | one reading per card; verify rule "exactly one box" |
| Shape `venn` | the template draws the two different attributes of colour / kind / size itself (no `axes` param); `outside` off → no card outside, `allowEmpty: true` | the §3 params list `facts`, `items`, `outside` |
| Animal facts | two pairs, fly × swim and farm × legs:4; swim × legs:4 is dropped; a frog never sits in a legs:4 venn, a dog never in a swim or a farm venn; farm × legs:4 holds 7 cards outside the middle, so 8 cards without `neither` always draw fly × swim | the only card in both circles of swim × legs:4 is the frog, whose emoji is a face; dogs swim and live on farms: "never a card whose fact a child could dispute" |
| Animal cards | emoji only (the accessible name is the emoji), `tags` as in the table; a penguin is only ever a swimmer | spec |
| `odd-one` | the odd card is unique in the asked attribute; with noise a second attribute (drawn from the other three) splits the 4 cards 2-2, so two cards can look the same ([red circle, blue circle, blue circle, red square]); without noise the other attributes are fixed | spec |
| `odd-rule` | the 3 options always name colour, kind and size once each; ids `colour-red` … carry the attribute and value (the sentence is out of the `check`'s sight); 4 scored items in the lesson: colour, kind, size, size | "one per attribute" for 4 items with 3 attributes |
| Reasons | none: W2's wrong cards get the kit's note, a wrong put the `group` kind's (`cards.group.wrong*`: Carroll right column / row, Venn middle / outside) | the spec lists no bug for W2 |
| Easier variants | on the item the lesson table's parentheses name: `odd-noise-b-1` (last), `rule-last-1` (4th of 6), `car-kind-count-1` (last), `venn-an-b-1` (last), `lu-order` (5th of 6) | `lu-order` is the item the variant fits (3 animals → 3 sizes) |
| `lu-*` | authored; the options / cards are not shown in the order the text names the animals; `lu-true` has no card: True / False buttons under the statement "True or false: the chick is taller than the owl." (reworded by the lead from a question) | no reading shortcut beyond the first clue; spec |
| `group` UI (platform) | Venn board at most `min(28rem, max(17.5rem, 46vh))` wide (was `max-w-md`); the pool's columns follow the number of cards: 2 / 3 on a phone, one row of up to 8 cards from 768 px (`POOL_COLUMNS`) | visual pass: at 1024 × 768 the Venn pushed the cards under the fold, 5+ cards wrapped to a second row |
| Voice | the instruction of every generated item is one fixed sentence per template variant; the box / axis words and the rule sentences are on the cards only, not narrated; the group notes (plain, Carroll row / column, Venn middle / outside, each also with the easier offer, 3 hints) join the inventory | plan L6 |

## 4. Picture library (W3 `grd-pixels`, `m14.11`)

12 authored 5 × 5 pictures (`#.` rows, `reveal` emoji): fish 🐟, cat 🐱, rabbit 🐰, duck 🦆, snail 🐌, turtle 🐢, crab 🦀, owl 🦉, frog 🐸, bee 🐝, snake 🐍, mouse 🐭. Clues computed at compile; `verify`: line-solvable with the item's techniques (full-line → overlap → cross-out → combine), one solution. A picture that fails is redrawn or dropped (≥ 7 needed: 2 guided, 4 scored, 1 variant).

## 5. Voice budget (plan L6: ≤ 230 clips)

| Part | Clips (cap) | Content |
|---|---|---|
| W1 | 55 (49 used, `m14.9`) | 4 lessons (title, story, demo), template sentences, 4 reasons, Pattern Train, hub / Journey / rank / badge lines |
| W2 | 65 (41 used, `m14.10`) | 5 lessons (story, demo), 7 template sentences, 4 transitive items, Sorting Sprint goal, `group` kind notes (13), order / true-false hints, hub / Journey / rank / badge lines |
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
| W1.11 | W1 | Visual pass on the production build, 1024 x 768 and 390 x 844 (hub, Logic Home, Journey, every template, the unit-break and first-jump reasons, Pattern Train): every shape row on one line with square boxes (8 tokens at 390 px too), no horizontal scroll. Platform items: the 4th hub tile wrapped under the other three and was cut at 768 px (fixed by the lead in `m14.9`: 2 × 2 on a phone, one row from 1024 px); the `step-rule` text cards were 70 px wide on a 1024 x 768 tablet (fixed: choice options sized by their container, 2 columns in the side column); a 5-term number row wraps to two lines on a phone (the pad narrows the card; open, F14) | ok (2 fixed, 1 open) |
| W2.1 | W2 | Odd one out ("Which one is different?", 12 items: `cls-odd` 9, `cls-rule` 2 noise items, Sorting Sprint 1): 3-4 cards equal in every attribute but one, in which exactly the answer is unique; with noise a second attribute splits the 4 cards 2-2 (no card unique in it); re-derived from the compiled cards | ok |
| W2.2 | W2 | Rule cards ("What is the same about all of them?", 8 items: `cls-rule` 7, Sprint 1): a row of 3-4 different cards, 3 sentences naming colour, kind and size; exactly the answer is true of every card, each other names a value that some card has but not all; counts of 1 only | ok |
| W2.3 | W2 | Boxes ("Put each card in its box.", 6 items: `cls-boxes` 5, Sprint 1): the box rules put every card in exactly one box = the answer, every box holds a card, the cards are all different, "Red" / "Not red" say the rule, 3 boxes hold 3 different values | ok |
| W2.4 | W2 | Carroll tables ("Look at both rules. Where does each card go?", 5 items: `cls-boxes` 4, Sprint 1): the two rules put every card in exactly one of the 4 zones = the answer, every zone holds a card, "X" / "Not x" say the rules; the four tables are colour × kind, size × kind, colour × size, kind × count | ok |
| W2.5 | W2 | Venn diagrams ("Where does each card go? The middle fits both.", 10 items: `cls-circles` 9, Sprint 1): the rules put every card in its region = the answer, the middle and both circle-only regions hold a card, the outside holds one only when asked for (`allowEmpty` otherwise); animals carry exactly the table's facts, fly × swim and farm × legs:4 only, no frog with legs:4, no dog with swim or farm, a penguin never flies | ok |
| W2.6 | W2 | Line-ups (5 generated items): 3-5 cards of one kind and colour that differ in one attribute only, shown in a mixed order; the answer is the strict order, smallest or fewest first, no tie | ok |
| W2.7 | W2 | The four "taller than" items: two clues chain (A > B, B > C ⇒ A > C) to the answer (bear tallest, dog shortest, mouse < cat < dog, chick not taller than the owl); the cards are the animals of the text; the cards are not shown in the order the text names the animals, nor is the text's order the answer's | ok |
| W2.8 | W2 | The five demos agree with their cards (three blue circles and a blue square; small red circle, big red square, medium red star; a big red circle; a big blue square; tiny, medium, huge green triangles) | ok |
| W2.9 | W2 | Look-alikes (44 items with shapes): no two cards of one exercise differ only in a confusable colour (red-green, green-orange, blue-purple), no square with a diamond | ok |
| W2.10 | W2 | The answer takes every place: among the 9 choices of 4 cards each place holds it at least once; the 3-card choices and the rule sentences use more than one place | ok |
| W2.11 | W2 | Voice: every story, demo, instruction and the Sorting Sprint goal are in the inventory with generated audio (`pnpm voice:check`: 41 clips added, none removed); the box / axis words and rule sentences are on the cards only, not narrated | ok |
| W2.12 | W2 | Visual pass on the production build, 1024 x 768 and 390 x 844 (Journey World 2, odd one out and rule cards, rows of 2 and 3 boxes with a wrong put, Carroll tables incl. `kind × count`, Venn over shapes and animals with a wrong put, the line-ups, the clue items, the Sorting Sprint: 78 screenshots): every box at least 75 px, no horizontal scroll, no overlap, the miss notes read ("Right column! Now check the row.", "Does it fit both circles, or just one?"). Platform `group` UI, fixed in `m14.10` (24 lines): the Venn board (28 rem) pushed the cards below a 768 px screen, and the pool wrapped to a second row from 5 cards → the board is at most 46 % of the screen high (never under 17.5 rem) and the pool keeps one row up to 8 cards from 768 px (3 columns on a phone). Open: a card-kit `choice` without a prompt (`odd-one`) draws its small tiles at the bottom of the screen with the centre empty; the Venn on a phone keeps the pool partly below the fold (1 row of 3 visible, the rest scrolls); `lu-true` asked a question under True / False (fixed by the lead: a statement); the prompt-less `choice` layout is follow-up F15 | ok (3 fixed, 2 open) |
