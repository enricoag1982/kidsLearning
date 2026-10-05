# Math — curriculum (v1.2: W1 shipped in `m13.10`, W2 in `m13.11`, W3 in `m13.14`)

Lesson / exercise design for W1–W3 of [plan.md](plan.md) §2. A world's rows are its plan until its iteration lands, then what shipped (like `docs/subjects/coding/curriculum.md`), plus the content review log (§6). W1 Number Meadow (`m13.10`), W2 Mental Math Mountain (`m13.11`) and W3 Times-Table Forest (`m13.14`) are shipped.

## 1. Shape

| Item | Rule |
|---|---|
| Track | main `numbers` ("Number Adventures"): W1 `number-meadow` (habitat `meadow`), W2 `mental-mountain` (`mountains`), W3 `times-forest` (`forest`). The demo world `adding` retired in `m13.10` (§2 W1) |
| Characters | Owl narrates; the Hedgehog teaches (every lesson; the math demo's character and the hub icon) |
| Ranks | `counter` (start) → `builder` (W1) → `climber` (W2) → `multiplier` (W3) |
| Lesson | story 2–3 sentences (Owl + Hedgehog, the rule), demo = full worked example (fading: guided 1 leaves the last step, guided 2 two steps), 2 guided, 6 scored, ≥ 1 easier variant for the hardest scored item, concept = lesson id |
| CPA | guided and the first 4 scored may show pictures (blocks, line, groups, array); the last 2 scored are symbols only (W1: all lessons but `pv-line`, whose table has one symbol item, `nl-half`, last; W2: only the `bridge-add` cards carry a picture (a small number line, `m15.3`), bonds, sums and stories are symbols or text, §2 W2; W3: all lessons) |
| Generated | every guided / scored / variant / boss round comes from a template (§3) with a stored seed; stories, demos, word-problem frames and reasons are authored |
| Reasons | a wrong answer matching a known bug speaks its reason (§3 "Bugs"); any other wrong answer gets the kind's default note |
| Stars | card kit: 3 = no error, no hint; 2 = 1 error or hint 1; 1 = otherwise. Mastery = mean ≥ 2.4 |
| Bosses | one world boss per world (`tracks.yaml` `boss:`, also `unlockAfter` the world's last lesson) |
| Badges | generic `mastered` per world: Number Builder (W1), Mountain Climber (W2), Times Ranger (W3) |
| Numbers | answers ≤ 10 000 (pad 5 digits); `big` numerals without separators ≤ 4 digits, thin space from 5 digits |

## 2. Lessons

### W1 Number Meadow (place value) — shipped in `m13.10`

`packages/subject-math/content/`: `lessons/number-meadow/<lesson>.yaml`, `minigames/number-train.yaml`, `tracks.yaml`, `badges.yaml`, texts in `locales/en/`. Track `numbers` ("Number Adventures"), world `number-meadow` ("Number Meadow", habitat `meadow`), boss `number-train` (`tracks.yaml` `boss`). Every lesson is taught by the Hedgehog (Hedgie; the first Journey node shows "Hedgie the Counter", the others their titles); the Owl narrates ("Owl says: …"). Concept id = lesson id; every guided / scored / variant exercise and every boss round is a `generate:` entry (§3) with a stored seed, so every instruction is a generated text (`lessons:gen.<id>.text`).

| Lesson | Title | Concept | Kinds (guided / scored) | Guided | Scored (6) | Easier variant | Boss |
|---|---|---|---|---|---|---|---|
| `pv-hto` | Hundreds, tens, ones | `pv-hto` | place-value / place-value, number-entry, choice | 2 `pv-build` (243; 305) | 2 `pv-build` (one with zero tens) · 2 `pv-read` (one with zero tens) · 2 `pv-which` (one with zero tens) | 1 `pv-build` without a zero (for `hto-zero-1`) | — |
| `pv-compare` | Bigger or smaller? | `pv-compare` | choice / choice, order, true-false | 2 `cmp-sign` (same hundreds) | 3 `cmp-sign` (2 same hundreds, 1 same hundreds and tens) · 2 `cmp-order` · 1 `cmp-tf` | 1 `cmp-sign` with different hundreds (for `cmp-close-1`) | — |
| `pv-line` | The number line | `pv-line` | number-line / number-line, number-entry | 2 `nl-place` (0–1000 step 100; 0–100 step 10) | 3 `nl-place` (steps 10 / 100 / 50) · 2 `nl-estimate` · 1 `nl-half` | 1 `nl-place` step 100, every other mark numbered (for `line-fifties-1`) | — |
| `pv-thousands` | Thousands | `pv-thousands` | place-value / place-value, number-entry, choice, order | 2 `pv-build` (4 digits) | 2 `pv-build` (one with zero tens) · 2 `pv-expanded` · 1 `cmp-sign` · 1 `cmp-order` (4 digits) | 1 `pv-build` (4 digits) without a zero (for `th-zero-1`) | — |
| `pv-round` | Rounding | `pv-round` | choice / choice, number-entry, true-false | 2 `round-ten` | 3 `round-ten` (one with ones = 5, one 3-digit) · 2 `round-hundred` · 1 `round-tf` | 1 `round-ten` far from the middle (for `round-half-1`) | Number Train (world boss) |

Totals: 5 lessons, 10 guided, 30 scored, 5 easier variants, 5 boss rounds = 50 exercises (every one generated). Scored order puts the pictured items (blocks, line) first and the symbols last (CPA, §1); `pv-line` has the table's five line pictures and one symbol item.

Number Train (`number-train`, `series`, `errors3: 0`, `errors2: 2`, concept `pv-line`, `unlockAfter: pv-round`, title "Number Train", goal "Put every carriage number where it belongs on the line!"): 5 rounds, the carriage number goes where it belongs: `nl-place` step 100 → 50 → 10 (only the ends numbered), then 2 `nl-estimate` (0–1000, numbers at 0, 500, 1000). It is the world boss on the Journey once the five lessons are done, and the Today session's mini-game after Rounding.

Ranks `counter` (start) → `builder` (after `world:number-meadow`). Badges: `number-builder` ("Number Builder": `mastered` `world:number-meadow`, "Master Number Meadow and beat Number Train"), `star-counter` (`stars-total` 10 / 30, generic).

Retired in `m13.10`: the demo world `adding` (lessons `add-within-5`, `add-within-10`, `take-away`, boss `number-parade`, rank `adder`, badge `first-sums`, their texts). Stored progress for them is tolerated (G8, `m13.4`): the backup / merge keep it, total stars count it ("nothing is lost"), no Journey node, warm-up and Practice ignore its concepts (`apps/kids-learning/src/retired-content.test.tsx`, e2e `math/backup.spec.ts`).

### W2 Mental Math Mountain (mental strategies) — shipped in `m13.11`

`packages/subject-math/content/`: `lessons/mental-mountain/<lesson>.yaml`, `minigames/market-orders.yaml`, `tracks.yaml`, `badges.yaml`, texts in `locales/en/` (`journey.yaml`, `rewards.yaml`, `lessons.yaml`: the lessons' title / story / demo, `templates.*`, `bugs.*`, `stories.*`). World `mental-mountain` ("Mental Math Mountain", habitat `mountains`, order 2 of track `numbers`), boss `market-orders`. Taught by the Hedgehog (every lesson); the Owl narrates ("Owl says: …"). Concept id = lesson id; every guided / scored / variant exercise and every boss round is a `generate:` entry (§3) with a stored seed, so every instruction is a generated text (`lessons:gen.<id>.text`); a story problem's text is one of the authored `stories.*` sentences with its two numbers filled in.

| Lesson | Title | Concept | Kinds (guided / scored) | Guided | Scored (6) | Easier variant | Boss |
|---|---|---|---|---|---|---|---|
| `mm-bonds` | Number bonds | `mm-bonds` | number-entry / number-entry, choice | 2 `bond-missing` (10; 20) | 2 `bond-missing` (10; 20) · 2 `bond-missing` 100 · 1 `bond-pairs` (100) · 1 `equals-balance` | 1 `bond-missing` 100 in tens (for `bonds-hundred-1`) | — |
| `mm-doubles` | Doubles and halves | `mm-doubles` | number-entry / number-entry | `double` (≤ 20), `near-double` (≤ 20) | 2 `double` (≤ 50) · 2 `near-double` (≤ 50) · 2 `halve` (≤ 100) | 1 `double` ≤ 20 (for `dbl-big-1`) | — |
| `mm-bridge` | Bridge through ten | `mm-bridge` | number-entry / number-entry | 2 `bridge-add` (ones sum 11–13) | 4 `bridge-add` (3 with ones sum 11–16, 1 with 16–18) · 2 `count-up` | 1 `bridge-add` ones sum 11–12 (for `bridge-hard-1`) | — |
| `mm-tens` | Tens, hundreds, nearly | `mm-tens` | number-entry / number-entry | `tens-hundreds` (+ 10), `compensate` (+ 9) | 2 `tens-hundreds` (− 10; + 100) · 3 `compensate` (− 9; + 99; − 99) · 1 `equals-balance` | 1 `compensate` + 9 (for `comp-minus-1`) | — |
| `mm-problems` | Story problems | `mm-problems` | number-entry / number-entry | 2 `story` (part-whole; change: add) | 6 `story` (2 part-whole, 1 change: add, 1 change: take away, 2 comparison) | 1 `story` part-whole ≤ 20 (for `story-part-1`) | Market Orders (world boss) |

Totals: 5 lessons, 10 guided, 30 scored, 5 easier variants, 5 boss rounds = 50 exercises (every one generated); 65 new voice clips. The scored order keeps the symbols last (CPA, §1): the only W2 pictures are the `bridge-add` number lines (the guided tries and the first 4 scored items; see §3 "W2 templates as built").

Market Orders (`market-orders`, `series`, `errors3: 0`, `errors2: 2`, concept `mm-problems`, `unlockAfter: mm-problems`, title "Market Orders", goal "Help the market animals with their orders!"): 5 `story` rounds of mixed frames, one customer animal per round: add the parts (Bear), take away (Rabbit), compare "how many more" (Elephant), add more (Penguin), take away (Panda). It is the world boss on the Journey once the five lessons are done.

Ranks `counter` (start) → `builder` (after `world:number-meadow`) → `climber` (after `world:mental-mountain`). Badges: `number-builder`, `mountain-climber` ("Mountain Climber": `mastered` `world:mental-mountain`, "Master Mental Math Mountain and beat Market Orders"), `star-counter` (generic).

### W3 Times-Table Forest (times tables) — shipped in `m13.14`

`packages/subject-math/content/`: `lessons/times-forest/<lesson>.yaml`, `minigames/race-to-20.yaml` (the world boss), `tracks.yaml`, `badges.yaml`, texts in `locales/en/`. Track `numbers`, world `times-forest` ("Times-Table Forest", habitat `forest`, **order 3**, after World 2 Mental Math Mountain), boss `race-to-20` (`tracks.yaml` `boss`). Every lesson is taught by the Hedgehog (Hedgie); the Owl narrates ("Owl says: …"). Concept id = lesson id; every guided / scored / variant exercise is a `generate:` entry (§3) with a stored seed (§5). Spoken texts never contain "×": instructions, stories, demos and reasons say "times" ("Make an array for 3 times 4."); only the cards show `3 × 4`.

| Lesson | Title | Concept | Kinds (guided / scored) | Guided | Scored (6) | Easier variant (for the hardest scored item) |
|---|---|---|---|---|---|---|
| `mt-groups` | Equal groups | `mt-groups` | number-entry, choice / number-entry, choice | `groups` · `groups-choice` | 3 `groups` (the pictured ones) · 2 `groups-choice` · 1 `fact` (×2) | `groups` 2 groups of 2 (≤ 3 × 3; for `gr-big-1`, 4 groups of 5) |
| `mt-arrays` | Arrays | `mt-arrays` | array / array, true-false, number-entry | 2 `array-build` (3 rows of 2; 2 rows of 3) | 3 `array-build` (one with the rows free) · 2 `array-commute` · 1 `fact` | `array-build` 3 rows of 4 (≤ 3 × 4; for `ar-big-1`, 5 rows of 6) |
| `mt-2-5-10` | Twos, fives, tens | `mt-2-5-10` | number-entry / number-entry, true-false | `fact` ×2, `fact` ×10 | 3 `fact` (one of each table) · 1 `fact` ×5 (big b) · 1 `fact-missing` · 1 `fact-tf` | `fact` ×10 (for `t2-five-1`, 5 × 8) |
| `mt-4-8` | Fours and eights | `mt-4-8` | number-entry / number-entry, choice | 2 `fact` ×4 (double, double again) | 3 `fact` (×4 and ×8) · 1 `fact` ×8 (big b) · 1 `fact-missing` · 1 `fact-choice` | `fact` ×4 ≤ 5 (for `t4-hard-1`, 8 × 8) |
| `mt-3-6-9` | Threes, sixes, nines | `mt-3-6-9` | number-entry / number-entry, true-false | `fact` ×3, `fact` ×9 | 3 `fact` (one of each table) · 1 `fact` ×6 / ×9 (big b) · 1 `fact-missing` · 1 `fact-tf` | `fact` ×3 ≤ 5 (for `t3-hard-1`, 9 × 9) |
| `mt-7-mixed` | Sevens and mixed | `mt-7-mixed` | number-entry / number-entry, choice | `fact` ×7, `fact` ×0 | `fact` ×7 · `fact` ×1 · `fact` mixed 2–10 · `fact` ×6 / ×7 / ×9 (big b) · 1 `fact-missing` · 1 `fact-choice` (both mixed 2–10) | `fact` ×7 ≤ 5 (for `t7-hard-1`, 7 × 9) |

Totals: 6 lessons, 12 guided, 36 scored, 6 easier variants = 54 exercises (every one generated). Race to 20 is the world boss, opened by `mt-7-mixed`. Tables drilled (the `a` of every card): ×2 / ×5 / ×10, ×4 / ×8, ×3 / ×6 / ×9, ×7 with the ×0 and ×1 tricks, then 2–10 mixed in the last lesson's missing-number and choice items (and one mixed fact); `b` runs 2–10 (guided 3–9 or 2–6; easier variants up to 5, the ×10 one up to 9). The last two scored items of every lesson are symbols only (CPA, §1): `groups-choice` and `fact` in `mt-groups`, `array-commute` and `fact` in `mt-arrays`, all fact cards elsewhere.

Ranks `counter` (start) → `builder` (W1) → `climber` (W2) → `multiplier` (after `world:times-forest`). Badges: `times-ranger` ("Times Ranger": `mastered` `world:times-forest`, "Master Times-Table Forest and beat Race to 20").

Race to 20 (`duel`) — built in `m13.13` (`minigames/race-to-20.yaml`; game `race`, params `{ target: 20, maxStep: 3 }`), **the W3 world boss since `m13.14`**: add 1, 2 or 3 to the total; who says 20 wins. The bot moves first from 0 (a kid moving first from 0 loses to perfect play); bot level 1 (40 % mistakes); win once.

| Plan | As built |
|---|---|
| World boss of W3 | Yes (`m13.14`): `tracks.yaml` `boss: race-to-20`, `concept` and `unlockAfter` `mt-7-mixed` (the world's last lesson; `m13.13` had `take-away`, `m13.10` `pv-round`). It opens from its Journey node once the six lessons are mastered; the Today session no longer offers it after Rounding. Id `race-to-20` kept. e2e: `math/race.spec.ts` (Journey → world boss node → win, node won; Hint → 2 stars) |
| Hint "Leave a number in the 4 times table" | "Try to land on 4, 8, 12 or 16." (the best step button also glows) |
| Bot | the unlock lesson's character: the Hedgehog (`mt-7-mixed`), "Hedgie". Board lines are spoken after each move: "Hedgie adds 2. Now it's 7." / "You add 1. Now it's 4." (every step and total below 20) and "Your turn!"; unchanged by the move to W3 (the bot was already Hedgie since `m13.10`: no clip added or removed) |
| Board | number track 0–20 (the start alone and two rows of 10 on a phone, ≥ 32 px wide stones; two rows of 11 and 10 on a tablet, stones 56 px tall and 49 px wide at 1024 × 768: `m15.3`, one row of 28 × 40 px stones before), token on the total, last move's stones green (kid) / blue with a paw (bot), +1 +2 +3 buttons (80 px). The game title is the step's heading only: the standalone screen's top bar has the close button alone (`m15.3`; it showed the title twice) |

Totals: 16 lessons, 32 guided, 96 scored, 16 easier variants, 10 series rounds + 1 duel, all shipped: W1 (5 lessons, Number Train), W2 (5 lessons, Market Orders), W3 (6 lessons, Race to 20).

## 3. Templates

Kinds: card kit `choice` / `true-false` / `number-entry` / `order`; math `number-line` / `place-value` / `array` (plan §3).

| Template | Kind | Params (difficulty levers) | Answer | Bugs | Status |
|---|---|---|---|---|---|
| `pv-build` | place-value | `digits` 3 / 4, `zeroIn` none / tens / ones, `values` (fixed targets in order, a guided try) | n | `swap` | built (m13.9) |
| `pv-read` | number-entry | `digits`, `zeroIn`; "2 hundreds, 0 tens and 5 ones" + card "2H 0T 5O"; pad = digits + 1 | n | `swap`, `append` | built (m13.9) |
| `pv-which` | choice (3 numerals) | `digits`, `zeroIn`; same text + card "2H 0T 5O" | n | `swap`, `append` | built (m13.9) |
| `pv-expanded` | number-entry | `digits`; "3000 + 400 + 5" (one zero place, never the leading one) | n | `drop-zero` | built (m13.9) |
| `cmp-sign` | choice `<` `=` `>` | `digits` 3 / 4, `shared` 0 / 1 / 2 leading digits equal | sign | `ones-first` | built (m13.9) |
| `cmp-order` | order (4 numerals, smallest first) | `digits`, `shared` | order | — | built (m13.9) |
| `cmp-tf` | true-false | `digits`, `shared`; "406 > 460" | bool | `ones-first` | built (m13.9) |
| `nl-place` | number-line | `from`, `to`, `step` 1 / 10 / 50 / 100, `labels`, `values`; target = any inner tick | position | `ticks-not-gaps` | built (m13.9) |
| `nl-estimate` | number-line | same line params; target between ticks, ≥ ¼ step from each, tolerance ½ step (kind) | position | — | built (m13.9) |
| `nl-half` | number-entry | `unit` 10 / 100 / 1000; "halfway between 300 and 400" | 350 | — | built (m13.9) |
| `round-ten` | choice (the 2 tens); card: the number + a number line from the ten below to the ten above, a dot at the number | `max` 100 / 1000, `five` | ten | `truncate`, `five-down` | built (m13.9); line picture `m15.3` |
| `round-hundred` | number-entry | `max` 1 000 / 10 000, `five` | hundred | `truncate`, `five-down` | built (m13.9) |
| `round-tf` | true-false | `to` 10 / 100, `max`; "47 → 50" | bool | `truncate`, `five-down` | built (m13.9) |
| `bond-missing` | number-entry | `total` 10 / 20 / 100, `tensOnly` (100 only); "64 + ? = 100" | total − a | `digit-tens` | built (m13.11) |
| `bond-pairs` | choice (3 pairs) | `total` 10 / 20 / 100; "64 + 36" with the pairs 10 too many (`digit-tens`) and 10 too few (± 1 for 10 / 20) | pair | `digit-tens` | built (m13.11) |
| `double` | number-entry | `max` 20 / 50; "Double 34." + card "34 + 34" | 2n | `tens-only` | built (m13.11) |
| `near-double` | number-entry | `max` 10–50; card "35 + 36" | 2n + 1 | `off-by-one` | built (m13.11) |
| `halve` | number-entry | `max` 20–100, even from 12 | n / 2 | `halve-tens-only` | built (m13.11) |
| `bridge-add` | number-entry; card: "38 + 7" + a number line from 38 to 50 with dots on 38 and 40 (never 45) | `onesSum` [min, max] within 11–18, `max` 20–100; "38 + 7" | a + b | `off-by-one`, `off-by-ten` | built (m13.11); line picture `m15.3` |
| `count-up` | number-entry | `maxDiff` 4–12; "82 − 76" across a ten | b − a | `off-by-ten` | built (m13.11) |
| `tens-hundreds` | number-entry | `step` 10 / 100, `op` + / −; "347 + 10", one digit changes | n ± step | `wrong-place` | built (m13.11) |
| `compensate` | number-entry | `near` 9 / 99, `op` + / −; "46 + 99" | n ± near | `forgot-adjust` | built (m13.11) |
| `equals-balance` | number-entry | `max` 10–20; "7 + 5 = 6 + ?" | a + b − c | `answer-next` | built (m13.11) |
| `story` | number-entry (text only) | `frame` part-whole / change-add / change-take / compare, `max` 20–100; 4 authored sentences per frame (`stories.*`) | a ± b | `wrong-op` | built (m13.11) |
| `groups` | number-entry; card "3 groups of 4" + 3 clusters of 4 shapes | `maxGroups` 3–5, `maxSize` 3–9 (2 up to each) | k × n | `add-factors` | built (m13.14); clusters `m15.3` |
| `groups-choice` | choice (3 sums); card "3 groups of 4" + its clusters (`picture: false` = words only) | `maxGroups` 3–4, `maxSize` 3–4, `picture` (default true): "3 groups of 4" → 4 + 4 + 4 / 3 + 4 / 3 + 3 + 3 + 3 | 4 + 4 + 4 | `add-factors`, `neighbour` | built (m13.14); clusters `m15.3` |
| `array-build` | array; card "3 × 4" | `maxRows` 3–6, `maxCols` 3–6 (2 up to each), `fixedRows` (rows fixed by the text, default) | rows, cols | `neighbour` | built (m13.14) |
| `array-commute` | true-false | `max` 3–10: "3 × 4 = 4 × 3" / "3 × 4 = 3 + 4" | bool | `add-factors` | built (m13.14) |
| `fact` | number-entry; card "7 × 6" | `tables` (0–10), `b` [lowest, highest] (default 1–10) | a × b | `add-factors`, `neighbour`, `digit-swap` | built (m13.14) |
| `fact-missing` | number-entry; card "6 × ? = 42" | `tables` (1–10), `b` | b | `neighbour` | built (m13.14) |
| `fact-choice` | choice (3 numerals); card "8 × 7" | `tables` (1–10), `b` | a × b | `neighbour`, `add-factors` | built (m13.14) |
| `fact-tf` | true-false; card "4 × 8 = 32" | `tables` (1–10), `b` | bool | `neighbour` | built (m13.14) |

Bugs (one authored reason sentence each, spoken when the wrong answer matches):

| Bug | Wrong answer | Reason (shipped in `lessons.yaml` `bugs:` by m13.9 (W1), m13.11 (W2) and m13.14 (W3)) |
|---|---|---|
| `append` | 2005 for 2 H 0 T 5 O | "Each place holds one digit: 2 hundreds is 200, not 2000." |
| `swap` | 250 for 205 | "Look at the order: hundreds, then tens, then ones." |
| `drop-zero` | 345 for 3000 + 400 + 5 | "An empty place still needs a zero to hold its spot." |
| `ones-first` | compares the last digits | "Compare the biggest place first." |
| `ticks-not-gaps` | counts tick marks | "Count the jumps between the marks, not the marks." |
| `truncate` | rounds down always | "Rounding down every time? Check which number is nearer." |
| `five-down` | 5 rounds down | "Right in the middle? It goes up to the bigger number." |
| `digit-tens` | each digit to 10 (64 → 46) | "The tens make 90, then the ones make 10 more." |
| `tens-only` | doubles the tens only (34 → 64) | "Double the tens and the ones." |
| `halve-tens-only` | halves the tens only (74 → 39) | "Halve the tens and the ones." |
| `off-by-one` / `off-by-ten` | ± 1 / ± 10 | "So close! Count the last jump again." / "Check the tens." |
| `wrong-place` | changed the place below (347 + 10 = 348, 347 + 100 = 357) | "Ten changes the tens digit. A hundred changes the hundreds digit." |
| `forgot-adjust` | the round number without the 1 (46 + 99 = 146, 146 − 99 = 46) | "You used the round number. Now fix the answer by 1." |
| `answer-next` | 7 + 5 = 12 | "The equals sign means both sides are the same." |
| `wrong-op` | added instead of subtracted (or back) | "Read it again: does the number get bigger or smaller?" |
| `add-factors` | 3 + 4 for 3 × 4 | "Times means groups: 3 groups of 4." |
| `neighbour` | the fact one step along the table (a × (b − 1), else a × (b + 1)); an array one dot more or fewer in a row; a sum with one term more or fewer; the missing number ± 1 | "So close, just one off! Count again." |
| `digit-swap` | 42 for 24 | "Check the digits' order." |

### W1 templates as built (`m13.9`)

Code: `packages/subject-math/src/content/templates/` (`numeral`, `bugs`, `place-value`, `compare`, `number-line`, `rounding`, `index` = `MATH_TEMPLATES`); texts: `lessons.yaml` `templates.<id>` (`pv-read-4` / `pv-which-4` for 4 digits) and `bugs.<id>`; tests run every combination of §2 over 1 000 seeds and break every `check` by hand. The W1 lessons use them since `m13.10` (§5): a template text is narrated only in its filled-in form (`lessons:gen.<id>.text`), a bug text when some exercise can speak it (all 7 are).

| Item | As built | Why |
|---|---|---|
| Reason texts `drop-zero`, `truncate`, `five-down` | reworded (table above) | a template zero can sit in the tens or ones; rounding also covers hundreds |
| `pv-which` | also shows the card "2H 0T 5O" | the build-time `check` reads the question from the item; the sentence is not available to it |
| `append` | 3-digit numbers with a zero place; `pv-read` needs it to fit the pad (digits + 1: zero tens only), `pv-which` up to 5 digits; otherwise `pv-which` offers the hundreds / tens swap | place values written one after another are 8 digits for 4 digits: no numeral for a card |
| `cmp-sign` / `cmp-order` / `cmp-tf` `shared` | 0 / 1 / 2 (0 added) | the `pv-compare` variant "different hundreds" |
| `cmp-order` bug | none | the `order` kind has no reasons |
| `nl-half` bug | none | no wrong answer to name |
| `round-ten` line picture | built (`m15.3`; not built in `m13.10`, the choice card had no picture slot): the card shows the number and a line from the ten below to the ten above (step 1, 10 gaps) with one dot at the number; guided tries and the first 3 scored items (the last 3 are `round-hundred` / `round-tf`, symbols) | card kit `prompt.line` (`docs/adding-a-subject.md`); a fixed function of the number: no extra seed draw, the numbers and ids are unchanged |
| `round-hundred`, `round-tf` | `five-down` added | a number ending in 50 is half-way |
| `five: false` | no half-way number (ones 5 / ends in 50); `five: true` always | one lever per item |
| Ranges | `round-ten` 11 … max − 1; `round-hundred` 101 … max − 1; `round-tf` the lower neighbour ≥ `to` | no rounding to 0 |
| `nl-place` target | any inner tick, labelled or not (never an end) | an `all` / listed `labels` line is the easier variant |
| `nl-estimate` | target ≥ ¼ step from every tick as specified, but the kind's ± ½ step zone still covers the nearest tick | the zone is fixed by the kind (`tolerance` = step / 2) |
| `number-line` card on a tablet | `m15.3`: from `lg` (1024 × 768) the line card spans the board slot (616 px) and takes 3 parts of its height, the prompt card 2 (was 450 px over 152 px); the line, ticks, numbers and pin draw 1.6 × bigger (`--nl-scale`), 10 gaps are 53 px apart; a phone keeps the 152 px card under the prompt card | the 152 px card looked small under a 450 px prompt card |
| `pv-read` / `pv-which` text | fixed in `m13.10`: every non-zero place count is drawn from 2–9 (0 stays: "0 tens"), `check` rejects a card with a 1, a 1 000-seed test asserts no text says "1 hundreds" / "1 tens" / "1 ones" / "1 thousands" | the resolver pluralises one `count` var, not one per place; `pv-build` (no plural) still draws 1–9 |
| `round-easy` "far from the middle" | no template lever: the stored seed draws 31 (ones 1, 2, 8 or 9), a test pins it | one lever per item; a `far` param is not worth a template change |

### W2 templates as built (`m13.11`)

Code: `packages/subject-math/src/content/templates/` (`arithmetic`, `bonds`, `doubles`, `bridge`, `tens`, `story`, registered in `index`); texts: `lessons.yaml` `templates.<id>` (`compensate-add` / `compensate-take` for the two operations; none for `story`), `stories.<frame>-<n>` and `bugs.<id>`; tests run every parameter set of §2 over 1 000 seeds, solve each item again from its English sentence and card, and break every `check` by hand; `registry.test.ts` lists the 24 templates and their texts.

| Item | As built | Why |
|---|---|---|
| Reason texts `wrong-place`, `forgot-adjust` | reworded (tables above) | the drafts fit only "+ 10" / "adding 99"; the templates cover ± and 10 / 100, 9 / 99, and a `bugs.*` text is one fixed sentence |
| `halve-tens-only` | a 9th W2 bug id with its own sentence, used by `halve` | `tens-only` says "Double …" |
| Params | `max` / `maxDiff` are integer ranges (`story` and `bridge-add` 20–100, `halve` 20–100, `near-double` 10–50, `equals-balance` 10–20, `count-up` 4–12); `double` `max` 20 or 50; `bond-pairs` totals 10 / 20 / 100 | the lesson's value is one point of the range; a lower end gives the easier variants |
| `story` check | the card is text only and the generated sentence is not available to `check`, which re-derives the two numbers from the answer and the `wrong-op` value (their sum and difference); the tests solve every item from its English sentence | the build-time `check` reads the item, not the generated texts |
| `story` frames | 4 authored sentences per frame (16 `stories.*`), two numbers `{{a}}` `{{b}}`; add frames: different numbers ≥ 2, total ≤ `max`; take-away and comparison: the larger 5–`max`, the smaller ≥ 2, difference ≥ 2; a comparison always asks "how many more … than" (a subtraction) and `{{a}}`, the larger, may come second in the sentence (2 of 4 do) | "no keyword that points at the wrong operation" except the comparison's "more" (tests); animals are the app's avatars |
| `wrong-op` | always present: the difference (larger − smaller) for an add story, the sum for a take-away or comparison; plan: "when ≥ 0" | a child who subtracts takes the smaller from the larger |
| `bond-missing` / `bond-pairs` | the first number is 11–89 with no zero digit (`tensOnly`: a multiple of 10); `digit-tens` = the partner with each digit taken to 10 (always the answer + 10); the wrong pairs add 110 (`digit-tens`) and 90 (no reason) for 100, ± 1 (no reason) for 10 / 20; 10 / 20 take any first number | the partner and the partner ± 10 stay 11–89 |
| `double`, `halve`, `near-double` | `double` from 6 (≤ 20) or 11 (≤ 50); `halve` even from 12; `near-double` from 6; `tens-only` / `halve-tens-only` only when the number has a tens and a ones digit (not 0), the plain double of the smaller number is `off-by-one` | a multiple of 10 doubles right either way; a single digit has no tens |
| `bridge-add` | first number 0–8 tens and a ones digit 2–9, second number 2–9, so the ones always cross a ten (8 + 5 included); **line picture built in `m15.3`** (not in `m13.11`): the card shows "38 + 7" and a line from the first number to the ten after the total (38 to 50, 11–18 gaps), dots on the first number (38) and the next ten (40), never on the total (45) or at the end; the story and demo name the jump to the ten | a fixed function of the numbers (no extra seed draw); `check` re-derives the ends and the dots and fails on a dot or end at the answer |
| `count-up` | smaller number 11–89 not a multiple of 10, larger in the next ten and not on it, difference 2–`maxDiff`; `off-by-ten` = answer + 10 | the plan names no direction |
| `tens-hundreds`, `compensate` | 3-digit numbers, no carry or borrow (the changing digit 0–8 to add, 1–9 / 2–9 to take away); `compensate` ones 2–8, n 12–98 (102–998 to take away 99), text "Add 10, then take 1 away." / "Take away 100, then add 1 back." + "What is it?" | one concept per item |
| `equals-balance` | both addends ≥ 2, sum 4–`max`, the number after the equals sign is neither addend, the left sum is `answer-next` | no copy of an addend as the answer |
| Pad | `maxDigits` is widened only when a reason is longer than the answer (a take-away or comparison story: the sum, 3 digits) | a typed wrong number must fit |
| Test kit | `overSeeds` / `wordingProblems` take a word limit (stories 20, other cards 14) | story sentences have two sentences and a question |

### W3 templates as built (`m13.14`)

Code: `packages/subject-math/src/content/templates/` (`groups`, `array`, `fact`, the bug models in `bugs`, `index`); texts: `lessons.yaml` `templates.<id>` (`array-build-free` for the rows-free wording) and `bugs.<id>`; array notes and hints: `content/array-voice.ts`. Tests run every parameter set of §2 over 1 000 seeds with an independent `check` and break every `check` by hand (`templates/groups|array|fact.test.ts`); `templates/w3-lesson.test.ts` builds a fixture lesson with all 8.

| Item | As built | Why |
|---|---|---|
| `neighbour` reason text | "So close, just one off! Count again." (the draft said "That's the next fact. Count one group less.") | the neighbour is the fact under the answer (a × (b − 1)) or, at b = 1 or when that is the added factors, the one over: "one group less" is wrong for one of them; the same sentence also serves the array, sum and missing-number cases |
| `neighbour` fact | a × (b − 1), else a × (b + 1); never the answer or the added factors; none for table 0 and for 1 × 1 | one neighbour per item, the one under the answer first |
| `fact` reasons | `add-factors` (a + b), `neighbour`, `digit-swap` (only a 2-digit answer not ending in 0: 42 → 24; 40 → 04 is no answer a child gives); a value that is the answer or an earlier wrong value is left out (priority add-factors, neighbour, digit-swap) | reasons are distinct values; 2 × 2 has no `add-factors` (2 + 2 is the answer) |
| `fact` tables | 0–10 (the lesson `mt-7-mixed` drills ×0 / ×1); `fact-missing`, `fact-choice`, `fact-tf` take 1–10 | 0 × ? = 0 has every number as an answer; a table 0 has no neighbour fact |
| Drawn facts | uniform over the tables × b range; `fact-choice` skips facts without 3 distinct answers (1 × 1, 2 × 2), `fact-tf` facts without a neighbour; params that leave no fact are refused | an item always has its answer and reasons |
| `fact-missing` | "6 × ? = 42", the missing number b; the reason `neighbour` is b − 1 (b + 1 at b = 1) | one wrong value the child types |
| `groups` card | "3 groups of 4" and k clusters of n shapes (`prompt.shapes`, card kit tokens; one kind and one colour per item, a fixed function of k and n: the same numbers, the same picture; k 2–5, n 2–9, so at most 5 of the row's 8 tokens; each cluster on its own tile, 112 px at 1024 × 768 and 54–97 px on a phone, `m15.3`); `m15.3` replaced the one emoji of the thing (`m13.14`: the card's `emoji` holds 8 emoji, too few to draw the groups) | the fixed picture lets the expander tell a repeat; an extra seed draw would move every later item of the entry |
| `groups-choice` | `maxGroups` / `maxSize` 3–4; card "3 groups of 4" too, with its clusters unless `picture: false` (`mt-groups` sets it on the scored sums: both items come from one entry and the second is among the last 2 scored, which are symbols only, §1); 2 groups of 2 is never drawn; options: the sum of k n's, the added factors `k + n`, and the other way round (4 groups of 3: no reason, the wrong-answer note) or, for k = n, the same number one term more (one fewer when that is 5 terms) with `neighbour` | a card holds 16 characters: 5 terms are 17; "2 + 2" would be the answer and the added factors; the card lets the `check` read k and n |
| `array-build` | card "3 × 4" (as the array samples); `fixed-rows` written only when `false` ("Make an array for 3 times 4."); reasons: both (r, c − 1) and (r, c + 1) on the grid, each `neighbour`; the turned array has the kind's own "same number" note | the `check` reads the shape from the card; "×" is not spoken |
| `array-commute` | two different factors from 2 to `max` (3–10), true half the time; "3 × 4 = 3 + 4" speaks `add-factors` | 3 × 3 = 3 × 3 says nothing |
| Array voice | the kind's notes and hints join the voice inventory when the content has an array exercise: wrong note (plain, and with the easier offer), hints 1–3 (hint 2 per distinct `cols`), the turned-round note where it can happen, each reason (plain, and with the offer where the exercise has an easier variant), praise | `pnpm voice:check` covers exactly what can be spoken |

## 4. Rules for the build

| Rule | Where |
|---|---|
| Every template has an independent `check` (re-derives the answer from what the kid sees; unique answer; distinct options; every bug answer ≠ the answer) | template tests over 1 000 seeds |
| Generated items in one entry are distinct; ids are `<stem>-<n>` (never reseed a released lesson: bump the stem) | expander |
| Number-line targets on the line, ticks ≤ 11; estimate tolerance ± ½ interval and no tick at the target | `number-line` verify |
| Place-value targets ≤ 9 999; blocks ≤ 9 per column | `place-value` verify |
| Arrays ≤ 6 × 6 on the grid board | `array` verify |
| Instructions ≤ 14 words; text names what to do ("Build 305 with blocks.") | content tests |
| Spoken texts (instructions, stories, demos, reasons) never contain "×": say "times"; cards (`prompt.big`) keep "3 × 4" | `times-forest.test.ts` over the voice inventory |
| A fact appears once per lesson (7 × 8 and 8 × 7 count as one) | `times-forest.test.ts` |
| Content review rule (CLAUDE.md): every choice / true-false text has exactly one reading that leads to the answer | review log in this file |

## 5. Exercises as shipped

### W1 (`m13.10`)

Columns: generated id (`<stem>-<n>`, from the entry's `id`); template and stored seed (params in the YAML; **never change a seed or a count of a released lesson**: stored stars sit on the ids, tests pin them: `src/content/number-meadow.test.ts`); the card as drawn; the answer (the right option in bold); what it practises. Texts: [lessons.yaml](../../../packages/subject-math/content/locales/en/lessons.yaml) (`templates.*`, `bugs.*`, the lessons' story / demo). The W1 seeds are pinned in `src/content/number-meadow.test.ts`, the W3 seeds in `src/content/times-forest.test.ts`.

#### `pv-hto`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `hto-g-1` (guided) | `pv-build` @101 | Build 243 |  | first builds, no zero tens (243) then a zero in the tens (305) |
| `hto-g-2` (guided) | `pv-build` @101 | Build 305 |  | first builds, no zero tens (243) then a zero in the tens (305) |
| `hto-build-1` | `pv-build` @4 | Build 932 |  | blocks, three non-zero places |
| `hto-zero-1` | `pv-build` @26 | Build 507 |  | a zero in the tens: 507, not 57 (easier: `hto-easy-1`) |
| `hto-read-1` | `pv-read` @16 | 7H 3T 8O | 738 | from "7H 3T 8O" to the numeral |
| `hto-read-zero-1` | `pv-read` @20 | 8H 0T 5O | 805 | the `append` bug: 805, not 8005 |
| `hto-which-1` | `pv-which` @8 | 3H 7T 4O | **374** 347 734 | pick the numeral; the two others swap places |
| `hto-which-zero-1` | `pv-which` @13 | 6H 0T 4O | 640 6004 **604** | pick 604 among 640 / 6004 |
| `hto-easy-1` (easier) | `pv-build` @18 | Build 465 |  | build without a zero |

#### `pv-compare`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `cmp-g-1` (guided) | `cmp-sign` @9 | 288 ? 217 | < = **>** | same hundreds: read the tens, then the sign |
| `cmp-g-2` (guided) | `cmp-sign` @9 | 721 ? 796 | **<** = > | same hundreds: read the tens, then the sign |
| `cmp-sign-1` | `cmp-sign` @12 | 309 ? 361 | **<** = > | same hundreds; the ones disagree with the tens (the `ones-first` trap) |
| `cmp-sign-2` | `cmp-sign` @12 | 165 ? 157 | < = **>** | same hundreds; the ones disagree with the tens (the `ones-first` trap) |
| `cmp-close-1` | `cmp-sign` @8 | 263 ? 267 | **<** = > | same hundreds and tens: only the ones decide (easier: `cmp-easy-1`) |
| `cmp-order-1` | `cmp-order` @3 | 745 703 776 707 | 703 < 707 < 745 < 776 | four numbers, smallest first |
| `cmp-order-2` | `cmp-order` @3 | 308 371 355 319 | 308 < 319 < 355 < 371 | four numbers, smallest first |
| `cmp-true-1` | `cmp-tf` @8 | 266 < 225 | false | true / false: is the sign right |
| `cmp-easy-1` (easier) | `cmp-sign` @0 | 321 ? 145 | < = **>** | different hundreds |

#### `pv-line`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `line-g-hundreds-1` (guided) | `nl-place` @2 | 700 on 0–1000, step 100 | place; numbered: 0 500 1000 | jumps of 100 from a numbered middle (0, 500, 1000) |
| `line-g-tens-1` (guided) | `nl-place` @1 | 60 on 0–100, step 10 | place; numbered: 0 50 100 | jumps of 10, the middle 50 numbered |
| `line-tens-1` | `nl-place` @2 | 70 on 0–100, step 10 | place; numbered: ends | count the jumps of 10, only the ends numbered |
| `line-hundreds-1` | `nl-place` @18 | 400 on 0–1000, step 100 | place; numbered: ends | count the jumps of 100, only the ends numbered |
| `line-fifties-1` | `nl-place` @2 | 350 on 0–500, step 50 | place; numbered: ends | jumps of 50 (easier: `line-easy-1`) |
| `line-guess-big-1` | `nl-estimate` @1 | 625 on 0–1000, step 100 | estimate; numbered: 0 500 1000 | estimate between marks (0-1000) |
| `line-guess-small-1` | `nl-estimate` @18 | 36 on 0–100, step 10 | estimate; numbered: ends | estimate between marks (0-100) |
| `line-half-1` | `nl-half` @308 | 800 … 900 | 850 | halfway between two hundreds (symbols) |
| `line-easy-1` (easier) | `nl-place` @6 | 500 on 0–1000, step 100 | place; numbered: 0 200 400 600 800 1000 | jumps of 100, every other mark numbered |

#### `pv-thousands`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `th-g-1` (guided) | `pv-build` @20 | Build 7463 |  | 4-digit builds, no zero |
| `th-g-2` (guided) | `pv-build` @20 | Build 4278 |  | 4-digit builds, no zero |
| `th-build-1` | `pv-build` @4 | Build 9321 |  | 4 columns, no zero |
| `th-zero-1` | `pv-build` @9 | Build 2802 |  | a zero in the tens (easier: `th-easy-1`) |
| `th-expanded-1` | `pv-expanded` @8 | 6000 + 30 + 7 | 6037 | 3000 + 400 + 5: an empty place still counts (the `drop-zero` bug) |
| `th-expanded-2` | `pv-expanded` @8 | 5000 + 800 + 3 | 5803 | 3000 + 400 + 5: an empty place still counts (the `drop-zero` bug) |
| `th-sign-1` | `cmp-sign` @8 | 2365 ? 7482 | **<** = > | different thousands (the ones disagree) |
| `th-order-1` | `cmp-order` @2 | 7875 7285 7324 7537 | 7285 < 7324 < 7537 < 7875 | four 4-digit numbers, same thousands |
| `th-easy-1` (easier) | `pv-build` @19 | Build 1357 |  | 4-digit build without a zero |

#### `pv-round`

The `round-ten` cards also draw a number line from the ten below to the ten above with a dot at the number (`m15.3`); `round-hundred` and `round-tf` are symbols.

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `round-g-1` (guided) | `round-ten` @2 | 73 | **70** 80 | nearest ten: one down, one up |
| `round-g-2` (guided) | `round-ten` @2 | 36 | 30 **40** | nearest ten: one down, one up |
| `round-ten-1` | `round-ten` @9 | 28 | 20 **30** | nearest ten (round up) |
| `round-half-1` | `round-ten` @18 | 45 | 40 **50** | ones = 5 goes up (the `five-down` bug; easier: `round-easy-1`) |
| `round-big-1` | `round-ten` @5 | 698 | 690 **700** | nearest ten of a 3-digit number |
| `round-hundred-1` | `round-hundred` @2 | 732 | 700 | nearest hundred (symbols) |
| `round-hundred-2` | `round-hundred` @2 | 354 | 400 | nearest hundred (symbols) |
| `round-true-1` | `round-tf` @10 | 591 → 500 | false | true / false: is this the nearest hundred (symbols) |
| `round-easy-1` (easier) | `round-ten` @0 | 31 | **30** 40 | a number far from the middle (ones 1, 2, 8, 9) |

#### Number Train

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `train-hundreds-1` | `nl-place` @1 | 600 on 0–1000, step 100 | place; numbered: ends | steps of 100 |
| `train-fifties-1` | `nl-place` @6 | 250 on 0–500, step 50 | place; numbered: ends | steps of 50 |
| `train-tens-1` | `nl-place` @18 | 40 on 0–100, step 10 | place; numbered: ends | steps of 10 |
| `train-guess-1` | `nl-estimate` @3 | 726 on 0–1000, step 100 | estimate; numbered: 0 500 1000 | estimate between the marks |
| `train-guess-2` | `nl-estimate` @3 | 428 on 0–1000, step 100 | estimate; numbered: 0 500 1000 | estimate between the marks |

Stories ("Owl says: …", Hedgie, 2–3 sentences) and demos (a worked example with its card) are authored per lesson; the demo cards are `205`, `406 < 460`, `300`, `3405`, `47 → 50`.

### W2 (`m13.11`)

Same columns; seeds and counts are frozen by `src/content/mental-mountain.test.ts` (never change a seed or a count of a released lesson). A story problem's card column is its sentence (the card has no picture), its answer is bold.

#### `mm-bonds`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `bonds-g-ten-1` (guided) | `bond-missing` @1 | 6 + ? = 10 | 4 | first bond: 6 and 4 make 10 |
| `bonds-g-twenty-1` (guided) | `bond-missing` @1 | 12 + ? = 20 | 8 | bond to 20: 12 and 8 |
| `bonds-ten-1` | `bond-missing` @0 | 3 + ? = 10 | 7 | bond to 10 (3 and 7) |
| `bonds-twenty-1` | `bond-missing` @0 | 6 + ? = 20 | 14 | bond to 20 (6 and 14) |
| `bonds-hundred-1` | `bond-missing` @2 | 63 + ? = 100 | 37 | bond to 100 with tens and ones: the tens make 90, the ones 10 (the `digit-tens` bug; easier: `bonds-easy-1`) |
| `bonds-rest-1` | `bond-missing` @5 | 67 + ? = 100 | 33 | bond to 100 again, another pair |
| `bonds-pair-1` | `bond-pairs` @9 | Which two numbers make 100? | 28 + 82 **28 + 72** 28 + 62 | pick the pair that makes 100: 110 is `digit-tens`, 90 is a ten short |
| `bonds-gap-1` | `equals-balance` @11 | 10 + 6 = 9 + ? | 7 | the equals sign: both sides the same (the `answer-next` bug) |
| `bonds-easy-1` (easier) | `bond-missing` @1 | 60 + ? = 100 | 40 | bond to 100 in whole tens (easier) |

#### `mm-doubles`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `dbl-g-1` (guided) | `double` @6 | 13 + 13 | 26 | double 13: tens and ones both double |
| `near-g-1` (guided) | `near-double` @1 | 14 + 15 | 29 | near double: double 14 and 1 more |
| `dbl-big-1` | `double` @1 | 36 + 36 | 72 | double up to 50 (the `tens-only` bug; easier: `dbl-easy-1`) |
| `dbl-more-1` | `double` @0 | 21 + 21 | 42 | double up to 50 |
| `near-1` | `near-double` @2 | 38 + 39 | 77 | near double (the plain double is `off-by-one`) |
| `near-2` | `near-double` @2 | 20 + 21 | 41 | near double across a ten (20 + 21) |
| `half-1` | `halve` @3 | 76 | 38 | half of an even number to 100 (the `halve-tens-only` bug) |
| `half-2` | `halve` @3 | 14 | 7 | half of a small even number |
| `dbl-easy-1` (easier) | `double` @13 | 14 + 14 | 28 | a double up to 20 (easier) |

#### `mm-bridge`

The `bridge-add` cards also draw a number line from the first number to the ten after the total, dots on the first number and the next ten, never on the total (`m15.3`); `count-up` is symbols.

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `bridge-g-1` (guided) | `bridge-add` @1 | 7 + 5 | 12 | make a ten first, within 20 |
| `bridge-g-2` (guided) | `bridge-add` @1 | 86 + 7 | 93 | make a ten first, 2-digit number |
| `bridge-1` | `bridge-add` @2 | 28 + 6 | 34 | bridge through ten (the `off-by-one` and `off-by-ten` bugs) |
| `bridge-2` | `bridge-add` @2 | 45 + 9 | 54 | bridge through ten |
| `bridge-3` | `bridge-add` @2 | 59 + 3 | 62 | bridge through ten, small second number |
| `bridge-hard-1` | `bridge-add` @5 | 69 + 8 | 77 | ones adding to 16-18 (easier: `bridge-easy-1`) |
| `count-1` | `count-up` @4 | 45 − 39 | 6 | count up across a ten (the `off-by-ten` bug) |
| `count-2` | `count-up` @4 | 22 − 14 | 8 | count up across a ten |
| `bridge-easy-1` (easier) | `bridge-add` @5 | 67 + 5 | 72 | ones adding to 11-12 (easier) |

#### `mm-tens`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `tens-g-1` (guided) | `tens-hundreds` @5 | 762 + 10 | 772 | ten more: only the tens digit changes |
| `comp-g-1` (guided) | `compensate` @6 | 52 + 9 | 61 | add 9 as 10, then take 1 away |
| `tens-ten-1` | `tens-hundreds` @4 | 932 − 10 | 922 | ten less (the `wrong-place` bug) |
| `tens-hundred-1` | `tens-hundreds` @2 | 632 + 100 | 732 | a hundred more: only the hundreds digit changes |
| `comp-nine-1` | `compensate` @2 | 74 − 9 | 65 | take away 9 as 10, then add 1 back |
| `comp-ninety-1` | `compensate` @5 | 77 + 99 | 176 | add 99 as 100, then take 1 away (the `forgot-adjust` bug) |
| `comp-minus-1` | `compensate` @2 | 733 − 99 | 634 | take away 99 as 100, then add 1 back (easier: `comp-easy-1`) |
| `tens-gap-1` | `equals-balance` @15 | 6 + 7 = 5 + ? | 8 | the equals sign again (the `answer-next` bug) |
| `comp-easy-1` (easier) | `compensate` @3 | 72 + 9 | 81 | add 9 (easier) |

#### `mm-problems`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `story-g-parts-1` (guided) | `story` @8 | Bear sold 17 loaves in the morning and 53 in the afternoon. How many loaves did Bear sell? | **70** | part-whole: the parts come together, add |
| `story-g-change-1` (guided) | `story` @15 | Frog has 25 stickers. A friend gives Frog 32 more. How many stickers does Frog have now? | **57** | change: more are added, add |
| `story-part-1` | `story` @5 | Fox has 68 red berries and 25 blue berries. How many berries in all? | **93** | part-whole with carrying (easier: `story-easy-1`) |
| `story-parts-1` | `story` @12 | Rabbit picked 29 carrots and Cat picked 7 carrots. How many carrots did they pick together? | **36** | part-whole, a different story |
| `story-gets-1` | `story` @9 | Penguin had 21 fish. Then Penguin caught 68 more. How many fish does Penguin have now? | **89** | change, more added |
| `story-gives-1` | `story` @11 | Panda baked 54 buns and sold 29 of them. How many buns are left? | **25** | change, some taken away |
| `story-more-1` | `story` @5 | Elephant has 71 peanuts. Penguin has 54 peanuts. How many more peanuts does Elephant have than Penguin? | **17** | comparison: "how many more" is a subtraction |
| `story-fewer-1` | `story` @15 | Cat has 11 stickers. Bear has 27 stickers. How many more stickers does Bear have than Cat? | **16** | comparison, the smaller number comes first in the story |
| `story-easy-1` (easier) | `story` @15 | Bear sold 6 loaves in the morning and 7 in the afternoon. How many loaves did Bear sell? | **13** | part-whole story up to 20 (easier) |

#### Market Orders

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `order-parts-1` | `story` @2 | Bear sold 73 loaves in the morning and 10 in the afternoon. How many loaves did Bear sell? | **83** | add the parts |
| `order-left-1` | `story` @13 | Rabbit had 59 carrots. Rabbit ate 22 of them. How many carrots are left? | **37** | take away: how many are left |
| `order-more-1` | `story` @4 | Elephant has 93 peanuts. Penguin has 31 peanuts. How many more peanuts does Elephant have than Penguin? | **62** | compare: how many more |
| `order-gets-1` | `story` @13 | Penguin had 56 fish. Then Penguin caught 17 more. How many fish does Penguin have now? | **73** | add more |
| `order-gives-1` | `story` @10 | Panda baked 53 buns and sold 47 of them. How many buns are left? | **6** | take away: how many are left |

Demos (a worked example with its card): `64 + 36 = 100`, `35 + 36`, `38 + 7`, `46 + 99`, `12 + 5`; the stories ("Owl says: …", Hedgie, 2–3 sentences) are authored per lesson.

### W3 (`m13.14`)

Reasons per card (not in the tables): every `fact` speaks `add-factors` (a + b), `neighbour` (the fact one step along) and `digit-swap` (a 2-digit answer, digits swapped) where they exist (§3); the missing number speaks `neighbour` (± 1); a `fact-choice` marks its `neighbour` and `add-factors` options; a false `fact-tf` / `array-commute` claim speaks `neighbour` / `add-factors`; an array speaks `neighbour` for one dot more or fewer in a row. The card's shapes are the thing counted (k clusters of n, one kind and colour per `groups` item, `m15.3`).

#### `mt-groups`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `gr-g-1` (guided) | `groups` @1 | 3 groups of 2 · 3 clusters of 2 blue diamonds | 6 | a first picture of groups: 3 groups of 2, added up (3 + 2 = 5 speaks `add-factors`) |
| `gr-gc-1` (guided) | `groups-choice` @7 | 2 groups of 3 · 2 clusters of 3 yellow stars | 2 + 2 + 2 2 + 3 **3 + 3** | which sum shows 2 groups of 3 (guided): 3 + 3; 2 + 2 + 2 (the other way round) and 2 + 3 (`add-factors`) are the wrong ones |
| `gr-total-1` | `groups` @32 | 3 groups of 4 · 3 clusters of 4 orange squares | 12 | groups of 4, how many in all |
| `gr-total-2` | `groups` @32 | 2 groups of 4 · 2 clusters of 4 purple hearts | 8 | 2 groups of 4 |
| `gr-big-1` | `groups` @5 | 4 groups of 5 · 4 clusters of 5 yellow diamonds | 20 | the biggest groups (4 groups of 5; easier: `gr-easy-1`) |
| `gr-sum-1` | `groups-choice` @1 | 4 groups of 2 | 4 + 4 4 + 2 **2 + 2 + 2 + 2** | which sum shows 4 groups of 2: 2 + 2 + 2 + 2; 4 + 4 (the other way round) and 4 + 2 (`add-factors`) are wrong |
| `gr-sum-2` | `groups-choice` @1 | 4 groups of 4 | 4 + 4 **4 + 4 + 4 + 4** 4 + 4 + 4 | k = n: 4 groups of 4 is four 4s; the 3-term sum speaks `neighbour`, 4 + 4 the `add-factors` |
| `gr-times-1` | `fact` @6 | 2 × 7 | 14 | the first fact as a symbol (symbols only) |
| `gr-easy-1` (easier) | `groups` @7 | 2 groups of 2 · 2 clusters of 2 red triangles | 4 | 2 groups of 2, the smallest picture |

#### `mt-arrays`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `ar-g-1` (guided) | `array-build` @2 | 3 × 2 | 3 rows of 2 | 3 rows of 2: tap the bottom-right dot; one dot more or fewer in a row speaks `neighbour` |
| `ar-g-2` (guided) | `array-build` @2 | 2 × 3 | 2 rows of 3 | 2 rows of 3, the same 6 dots turned round (the turned array speaks the "same number" note) |
| `ar-build-1` | `array-build` @5 | 4 × 5 | 4 rows of 5 | 4 rows of 5 |
| `ar-free-1` | `array-build` @2 | 4 × 3 | 4 rows of 3 (rows free) | the rows free ("an array for 4 times 3"): 4 rows of 3 or 3 rows of 4 both count |
| `ar-big-1` | `array-build` @31 | 5 × 6 | 5 rows of 6 | 5 rows of 6, the biggest array (easier: `ar-easy-1`) |
| `ar-commute-1` | `array-commute` @1 | 5 × 2 = 5 + 2 | false | false: 5 × 2 is not 5 + 2 (`add-factors`) |
| `ar-commute-2` | `array-commute` @1 | 6 × 5 = 5 × 6 | true | true: 6 × 5 = 5 × 6 (symbols only) |
| `ar-fact-1` | `fact` @4 | 4 × 6 | 24 | 4 × 6, the array as a fact (symbols only) |
| `ar-easy-1` (easier) | `array-build` @5 | 3 × 4 | 3 rows of 4 | 3 rows of 4 |

#### `mt-2-5-10`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `t2-g2-1` (guided) | `fact` @6 | 2 × 6 | 12 | skip count by 2 |
| `t2-g10-1` (guided) | `fact` @1 | 10 × 7 | 70 | times 10: add a zero |
| `t2-fact-1` | `fact` @3 | 10 × 3 | 30 | ×10 fact |
| `t2-fact-2` | `fact` @3 | 2 × 3 | 6 | ×2 fact |
| `t2-fact-3` | `fact` @3 | 5 × 5 | 25 | ×5 fact (a 2-digit answer with digits to swap) |
| `t2-five-1` | `fact` @1 | 5 × 8 | 40 | ×5 with a big b (easier: `t2-easy-1`) |
| `t2-missing-1` | `fact-missing` @1 | 5 × ? = 45 | 9 | 5 × ? = 45, the missing number |
| `t2-true-1` | `fact-tf` @5 | 10 × 4 = 30 | false | false: 10 × 4 is 40, not 30 (the fact under it speaks `neighbour`) |
| `t2-easy-1` (easier) | `fact` @4 | 10 × 9 | 90 | ×10 up to 9 (add a zero) |

#### `mt-4-8`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `t4-g-1` (guided) | `fact` @1 | 4 × 5 | 20 | ×4 as double, double again |
| `t4-g-2` (guided) | `fact` @1 | 4 × 2 | 8 | 4 × 2: double 2, double 4 |
| `t4-fact-1` | `fact` @2 | 8 × 6 | 48 | ×8 fact |
| `t4-fact-2` | `fact` @2 | 4 × 7 | 28 | ×4 fact |
| `t4-fact-3` | `fact` @2 | 8 × 2 | 16 | ×8 with a small b |
| `t4-hard-1` | `fact` @1 | 8 × 8 | 64 | 8 × 8 (easier: `t4-easy-1`) |
| `t4-missing-1` | `fact-missing` @1 | 8 × ? = 32 | 4 | 8 × ? = 32 |
| `t4-choice-1` | `fact-choice` @3 | 8 × 5 | 13 32 **40** | pick 8 × 5 among 13 (`add-factors`), 32 (`neighbour`) and 40 |
| `t4-easy-1` (easier) | `fact` @1 | 4 × 4 | 16 | ×4 up to 5 |

#### `mt-3-6-9`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `t3-g3-1` (guided) | `fact` @1 | 3 × 7 | 21 | ×3 by skip counting |
| `t3-g9-1` (guided) | `fact` @1 | 9 × 7 | 63 | ×9: 10 less one group |
| `t3-fact-1` | `fact` @3 | 9 × 3 | 27 | ×9 fact |
| `t3-fact-2` | `fact` @3 | 3 × 3 | 9 | ×3 fact |
| `t3-fact-3` | `fact` @3 | 6 × 5 | 30 | ×6 fact |
| `t3-hard-1` | `fact` @4 | 9 × 9 | 81 | 9 × 9 (easier: `t3-easy-1`) |
| `t3-missing-1` | `fact-missing` @1 | 6 × ? = 54 | 9 | 6 × ? = 54 |
| `t3-true-1` | `fact-tf` @4 | 9 × 8 = 72 | true | true: 9 × 8 is 72 |
| `t3-easy-1` (easier) | `fact` @1 | 3 × 4 | 12 | ×3 up to 5 |

#### `mt-7-mixed`

| id | template, seed | card | answer / options | practises |
|---|---|---|---|---|
| `t7-g7-1` (guided) | `fact` @1 | 7 × 7 | 49 | ×7 first fact |
| `t7-g01-1` (guided) | `fact` @7 | 0 × 3 | 0 | ×0: anything times 0 is 0 |
| `t7-seven-1` | `fact` @2 | 7 × 8 | 56 | ×7 fact |
| `t7-zero-1` | `fact` @2 | 1 × 3 | 3 | ×1: anything times 1 stays the same |
| `t7-mixed-1` | `fact` @3 | 8 × 6 | 48 | mixed tables (8 × 6) |
| `t7-hard-1` | `fact` @1 | 7 × 9 | 63 | 7 × 9 (easier: `t7-easy-1`) |
| `t7-missing-1` | `fact-missing` @8 | 3 × ? = 15 | 5 | 3 × ? = 15, mixed tables (symbols only) |
| `t7-choice-1` | `fact-choice` @6 | 6 × 9 | 48 15 **54** | pick 6 × 9 among 48 (`neighbour`), 15 (`add-factors`) and 54 (symbols only) |
| `t7-easy-1` (easier) | `fact` @1 | 7 × 4 | 28 | ×7 up to 5 |

Race to 20 (world boss): not generated (the game's params are `{ target: 20, maxStep: 3 }`).

Stories ("Owl says: …", Hedgie, 2–3 sentences) and demos are authored per lesson; the demo cards are `3 groups of 4` (with 🍓), `3 × 4`, `5 × 6`, `4 × 3`, `9 × 4`, `7 × 6`: each worked in the demo text with "times" and "plus" ("4 plus 4 plus 4 makes 12. So 3 times 4 is 12!").

## 6. Content review log

CLAUDE.md rule: every choice / true-false / setup text is checked against its card so exactly one reading leads to the accepted answer; no distractor items. The checks are run on the shipped cards by `src/content/number-meadow.test.ts` (W1), `src/content/mental-mountain.test.ts` (W2) and `src/content/times-forest.test.ts` (W3), re-derived from the compiled defs, not through the templates' own `check`, and over 1 000 seeds per template combination.

| Check | What was checked | Result |
|---|---|---|
| 1 | Every generated sentence is at most 14 words, has no `{{placeholder}}`, names what to do ("Build 932 with blocks."); no text says "1 hundreds" / "1 tens" / "1 ones" / "1 thousands" (place counts are 0 or 2–9 where a sentence has them) | ok |
| 2 | `pv-build` "Build 507 with blocks.": the card repeats the number, the target is that number, the columns fit it (3 or 4, ≤ 9 blocks per column); the swapped build (570) speaks `swap` | ok |
| 3 | `pv-read` "8 hundreds, 0 tens and 5 ones. What number is it?": the card "8H 0T 5O" says the same as the sentence, one answer (805), the pad is one digit wider (8005 speaks `append`, 850 speaks `swap`) | ok |
| 4 | `pv-which` "Which number has 3 hundreds, 7 tens and 4 ones?": the card repeats the places, exactly one of the 3 numerals has them (the other two are the `swap` / `append` numerals), the right card is not always in the same place (`a`, `c`) | ok |
| 5 | `pv-expanded` "Put the parts together. What number is it?": the card is a sum of place values, highest first, one zero place, one answer (6000 + 30 + 7 = 6037); leaving the zero out (637) speaks `drop-zero` | ok |
| 6 | `cmp-sign` "Which sign goes in the gap? The open side faces the bigger number.": the card "a ? b" has two different numbers, the three signs come in the order `<` `=` `>`, exactly one is true and it is the answer; the story teaches "the open side of the sign faces the bigger number"; where the ones disagree with the tens (309 ? 361, 165 ? 157, 321 ? 145, 2365 ? 7482) the wrong sign speaks `ones-first`; the signs of the 7 items are `>` `<` `<` `>` `<` `>` and `<`, not one sign throughout | ok |
| 7 | `cmp-order` "Put the numbers in order, smallest first.": 4 different numerals, the answer is ascending and is not the shown order | ok |
| 8 | `cmp-tf` "Is this true?" (266 < 225) and `round-tf` "Is this the nearest hundred?" (591 → 500): one statement on the card, the answer is its truth (half-way goes up); the wrong "true" of 591 → 500 speaks `truncate` | ok |
| 9 | `round-ten` "Round 28 to the nearest ten.": two cards, the tens either side, exactly one nearest (45 → 50: half-way goes up, wrong pick speaks `five-down`); the story says "5 or more goes up, less than 5 stays down" | ok |
| 10 | `round-hundred` "Round 732 to the nearest hundred.": one answer; the lower hundred speaks `truncate` when the answer is the upper one (354) | ok |
| 11 | `nl-place` "Put 700 on the number line.": the card repeats the number, it is an inner tick, at most 10 gaps; the guided lines number a middle (0, 500, 1000 / 0, 50, 100), the scored ones only the ends; the tick one step left speaks `ticks-not-gaps` | ok |
| 12 | `nl-estimate` "About where is 625? Put it on the line.": the number is between two ticks, at least ¼ step from each, accepted within ½ step; the Number Train's estimates (726, 428) are in the middle of the line, not in its first or last gap | ok |
| 13 | `nl-half` "What number is halfway between 800 and 900?": one answer (850), the card shows "800 … 900" | ok |
| 14 | Stories and demos: 2–3 sentences, "Owl says:" and Hedgie in every story, every demo has its card and works one example (205, 406 < 460, 300, 3405, 47 → 50) | ok |
| 15 | CPA: the last 2 scored items of `pv-hto`, `pv-compare`, `pv-thousands`, `pv-round` are symbols only; `pv-line` has the table's one symbol item (`nl-half`) last | ok (exception) |
| 16 | Easier variants: one per lesson, for the hardest scored item, with the property the table names (no zero; different hundreds; every other mark numbered; ones 1, 2, 8 or 9 far from the middle) | ok |
| 17 | No two alike items in a lesson (same card and same options, whatever the id) | ok |
| 18 | Voice: every story, demo, instruction, reason, the Number Train goal and Race to 20's Hedgie lines are in the inventory with generated audio (`pnpm voice:check`) | ok |
| 19 | The retired `adding` world: nothing of it left in the content or its texts; stored progress still imports and counts (G8) | ok |
| 20 | Placement, test-out of a lesson and of the world, and the parent unlock run on the shipped content (`src/content/placement.test.ts`): 4 of 4 passes World 1 via placement, the boss stays to play, Number Builder fires once it is won | ok |
| 21 | `bond-missing` "What number makes 100?" (63 + ? = 100): the card repeats the total, the answer completes it (37); for a bond to 100 the number with each digit taken to 10 (47) speaks `digit-tens`, a bond in whole tens has no such number (`bonds-easy-1`) | ok |
| 22 | `bond-pairs` "Which two numbers make 100?": 3 pairs with the same first number (28), exactly one adds to 100 and is the answer, the pair adding 110 speaks `digit-tens`, the pair adding 90 has no reason; the right pair is not always in the same place | ok |
| 23 | `equals-balance` "Both sides must be the same. What goes in the gap?" (10 + 6 = 9 + ?): both sides make 16, the gap is 7, never an addend; writing 16 speaks `answer-next` | ok |
| 24 | `double` "Double 36." (card 36 + 36), `near-double` "Use a double to help. What is the total?" (38 + 39), `halve` "What is half of 76?": the card and the sentence agree, one answer; doubling the tens only (66 for 72) and halving the tens only (41 for 38) speak `tens-only` / `halve-tens-only` only where the ones digit is used; the plain double of a near double speaks `off-by-one` | ok |
| 25 | `bridge-add` "Make a ten first. What is the total?" (69 + 8) and `count-up` "Count up from the smaller number. How many?" (45 − 39): the ones cross a ten, one answer; one jump / one ten short speak `off-by-one` / `off-by-ten`; the count-up pair is either side of a ten, not on it | ok |
| 26 | `tens-hundreds` "What is the answer?" (932 − 10): one digit changes, no carry; the next place down (931) speaks `wrong-place`. `compensate` "Add 100, then take 1 away. What is it?" (77 + 99): the sentence names the card's round number (99 + 1) and its operation; the round number alone (177) speaks `forgot-adjust` | ok |
| 27 | Stories: every sentence has two numbers and one operation by its frame (read back from the English sentence): add the parts / more, take away "left", compare "how many more … than" a subtraction of the larger by the smaller, the animal asked about holds the larger number; the other operation speaks `wrong-op`; no add story says left / fewer / less / remain / away, no take-away story says in all / together / total / more / now / both; every name is one of the app's animals | ok |
| 28 | Mix of frames: Story problems has 2 part-whole, 1 change (add), 1 change (take away), 2 comparisons (6 different stories); Market Orders is a part-whole, a take-away, a comparison, an add and a take-away, each for another customer animal (Bear, Rabbit, Elephant, Penguin, Panda) | ok |
| 29 | Stories and demos: 2–3 sentences, "Owl says:" and Hedgie in every story, every demo works one example with its card (64 + 36 = 100, 35 + 36, 38 + 7, 46 + 99, 12 + 5) | ok |
| 30 | CPA: W2 has no pictures (a bond, a sum and a story are symbols or text), so the last 2 scored items of every lesson are symbols or text; the plan's line picture for the bridging guided tries is not built (§3 "W2 templates as built") | ok (exception) |
| 31 | Easier variants: one per lesson, for the hardest scored item, with the property the table names (bond in whole tens; double ≤ 20 for a double up to 50; ones sum 11–12 for 16–18; + 9 for − 99; part-whole story ≤ 20 for one with carrying) | ok |
| 32 | No two alike items in a lesson (same sentence, card and options, whatever the id) | ok |
| 33 | Voice: every story, demo, instruction, reason and the Market Orders goal are in the inventory with generated audio (`pnpm voice:check`); the Journey / reward texts of W2 are new texts of the same kind | ok |
| 34 | Placement, test-out of a lesson and of the world, and the parent unlock run on both worlds (`src/content/placement.test.ts`): 4 of 4 passes World 2 via placement, the boss stays to play, Mountain Climber fires once Market Orders is won | ok |
| 35 | Reworded bug sentences fit every item that can speak them: `wrong-place` (+ / −, 10 / 100), `forgot-adjust` (9 / 99, + / −), each at most 14 words | ok |
| 36 | `groups` "How many in all?" over "3 groups of 4" + one emoji: one picture of the thing, the answer is k × n, the added factors (k + n) speak `add-factors` unless they are the answer (2 groups of 2) | ok |
| 37 | `groups-choice` "Which sum shows 2 groups of 3?": exactly one of the 3 sums has k terms that are all n and it is the answer (the other way round, 2 + 2 + 2, has the same total but shows 3 groups of 2, and the question says "shows"); the added factors speak `add-factors`; k = n offers the sum with one term more / fewer as `neighbour` | ok |
| 38 | `array-build` "Make 3 rows of 4 dots." / "Make an array for 4 times 3.": the card says rows × columns, the array is that shape, rows fixed unless the words say "an array for" (one item per lesson); one dot more or fewer in a row speaks `neighbour` | ok |
| 39 | `array-commute` "Is this true?" (6 × 5 = 5 × 6 true, 5 × 2 = 5 + 2 false): the answer is the truth, worked out by adding up; the false sum speaks `add-factors`; one true and one false in the lesson | ok |
| 40 | `fact` "What is 7 times 6?" / `fact-missing` "What number is missing?" over "6 × ? = 42" / `fact-choice` "Which is the answer?" over "8 × 7" / `fact-tf` "Is this true?" over "4 × 8 = 32": one answer each, worked out by adding up; the options of a choice are 3 distinct numbers with exactly one right; a false claim is the neighbour fact | ok |
| 41 | Stories and demos (W3): 2–3 sentences, "Owl says:" and Hedgie in every story, every demo has its card and works one example (`3 groups of 4`, `3 × 4`, `5 × 6`, `4 × 3`, `9 × 4`, `7 × 6`) | ok |
| 42 | CPA (W3): the pictures (groups, arrays) are among the first 4 scored items; the last 2 scored items of every lesson are symbols only | ok |
| 43 | Easier variants (W3): one per lesson for the hardest scored item (a smaller groups / array, a times-10 fact, a times-4 / 3 / 7 fact up to 5) | ok |
| 44 | No two alike items in a lesson, and each fact once per lesson (7 × 8 and 8 × 7 count as one); each fact lesson drills its own tables (×2 ×5 ×10; ×4 ×8; ×3 ×6 ×9; ×7 with ×0 / ×1 and a mixed 2–10 close) | ok |
| 45 | No spoken text (inventory: stories, demos, instructions, reasons, notes) contains "×": they say "times" | ok |
| 46 | Voice (W3): every story, demo, instruction, reason and array note is in the inventory with generated audio (`pnpm voice:check`: 75 clips added, none removed) | ok |
| 47 | Race to 20 is the W3 world boss (opened by `mt-7-mixed`, bot Hedgie); placement, world test-out, the won boss + badge and the parent unlock run over every world of the content (`src/content/placement.test.ts`); e2e `math/forest.spec.ts` (Journey with every earlier world done; Arrays end to end) and `math/race.spec.ts` (boss node → duel → won) seed every earlier world's lessons and bosses as the content has them | ok |
| 48 | Pictures (`m15.3`): every `groups` / `groups-choice` card draws k clusters of n (one kind and colour), every `round-ten` card a line between its two tens with a dot at the number, every `bridge-add` card a line from the first number to the ten after the total with dots on the first number and the next ten and none on the answer; each `check` re-derives the picture from the card's numbers; 1 000 seeds per parameter set; no number, id or option changed (the previous build's content equals the new one outside `prompt`) | ok |

Manual checks still open (owner, `docs/release.md` §1): a child's first run of `pv-hto` (blocks on the iPad / Android tablet), the number line with a finger on a phone, a child's first story problems (are the sentences readable aloud and on screen at 8; is the "how many more" comparison understood). Also open for World 3: the dot grid of `mt-arrays` with a finger, and how the voice reads "times" and the sums ("4 plus 4 plus 4").
