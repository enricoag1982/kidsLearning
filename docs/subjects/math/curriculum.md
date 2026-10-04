# Math — curriculum (v1.2 plan; content built in `m13.10`–`m13.14`)

Lesson / exercise design for W1–W3 of [plan.md](plan.md) §2. This file becomes the shipped list (like `docs/subjects/coding/curriculum.md`) when the content lands; each content iteration replaces its world's plan rows with what shipped, plus the content review log.

## 1. Shape

| Item | Rule |
|---|---|
| Track | main `numbers` ("Number Adventures"): W1 `number-meadow` (habitat `meadow`), W2 `mental-mountain` (`mountains`), W3 `times-forest` (`forest`). The demo world `adding` retires in `m13.10` |
| Characters | Owl narrates; the Hedgehog teaches (every lesson; the math demo's character and the hub icon) |
| Ranks | `counter` (start) → `builder` (W1) → `climber` (W2) → `multiplier` (W3) |
| Lesson | story 2–3 sentences (Owl + Hedgehog, the rule), demo = full worked example (fading: guided 1 leaves the last step, guided 2 two steps), 2 guided, 6 scored, ≥ 1 easier variant for the hardest scored item, concept = lesson id |
| CPA | guided and the first 4 scored may show pictures (blocks, line, groups, array); the last 2 scored are symbols only |
| Generated | every guided / scored / variant / boss round comes from a template (§3) with a stored seed; stories, demos, word-problem frames and reasons are authored |
| Reasons | a wrong answer matching a known bug speaks its reason (§3 "Bugs"); any other wrong answer gets the kind's default note |
| Stars | card kit: 3 = no error, no hint; 2 = 1 error or hint 1; 1 = otherwise. Mastery = mean ≥ 2.4 |
| Bosses | one world boss per world (`tracks.yaml` `boss:`, also `unlockAfter` the world's last lesson) |
| Badges | generic `mastered` per world: Number Builder (W1), Mountain Climber (W2), Times Ranger (W3) |
| Numbers | answers ≤ 10 000 (pad 5 digits); `big` numerals without separators ≤ 4 digits, thin space from 5 digits |

## 2. Lessons

### W1 Number Meadow (place value) — boss Number Train

| Lesson | Title | Guided | Scored (6) | Variant |
|---|---|---|---|---|
| `pv-hto` | Hundreds, tens, ones | 2 `pv-build` (243; 305) | 2 `pv-build` (1 with zero tens) · 2 `pv-read` · 2 `pv-which` | `pv-build` without a zero |
| `pv-compare` | Bigger or smaller? | 2 `cmp-sign` (same hundreds) | 3 `cmp-sign` · 2 `cmp-order` · 1 `cmp-tf` | `cmp-sign` with different hundreds |
| `pv-line` | The number line | 2 `nl-place` (0–1 000 step 100; 0–100 step 10) | 3 `nl-place` (steps 10 / 50 / 100) · 2 `nl-estimate` · 1 `nl-half` | `nl-place` step 100 |
| `pv-thousands` | Thousands | 2 `pv-build` 4 digits | 2 `pv-build` · 2 `pv-expanded` · 1 `cmp-sign` · 1 `cmp-order` (4 digits) | `pv-build` without a zero |
| `pv-round` | Rounding | 2 `round-ten` (line picture) | 3 `round-ten` (1 with ones = 5) · 2 `round-hundred` · 1 `round-tf` | `round-ten` far from the middle |

Number Train (`series`, 5 rounds): `nl-place` step 100 → 50 → 10, then 2 `nl-estimate` (the carriage number goes where it belongs).

### W2 Mental Math Mountain — boss Market Orders

| Lesson | Title | Guided | Scored (6) | Variant |
|---|---|---|---|---|
| `mm-bonds` | Number bonds | 2 `bond-missing` (10; 20) | 2 `bond-missing` 10 / 20 · 2 `bond-missing` 100 · 1 `bond-pairs` · 1 `equals-balance` | `bond-missing` 100 in tens |
| `mm-doubles` | Doubles and halves | `double`, `near-double` | 2 `double` · 2 `near-double` · 2 `halve` | `double` ≤ 20 |
| `mm-bridge` | Bridge through ten | 2 `bridge-add` (line picture) | 4 `bridge-add` · 2 `count-up` | `bridge-add` ones sum 11–12 |
| `mm-tens` | Tens, hundreds, nearly | `tens-hundreds`, `compensate` | 2 `tens-hundreds` · 3 `compensate` · 1 `equals-balance` | `compensate` + 9 |
| `mm-problems` | Story problems | 2 `story` (part-whole; change) | 6 `story` (2 part-whole, 2 change, 2 comparison; one comparison uses "more" with a subtraction) | `story` part-whole ≤ 20 |

Market Orders (`series`, 5 rounds): `story` rounds, a customer animal per round, mixed strategies.

### W3 Times-Table Forest — boss Race to 20

| Lesson | Title | Guided | Scored (6) | Variant |
|---|---|---|---|---|
| `mt-groups` | Equal groups | `groups`, `groups-choice` | 3 `groups` · 2 `groups-choice` · 1 `fact` (×2) | `groups` ≤ 3 × 3 |
| `mt-arrays` | Arrays | 2 `array-build` | 3 `array-build` · 2 `array-commute` · 1 `fact` | `array-build` ≤ 3 × 4 |
| `mt-2-5-10` | Twos, fives, tens | `fact` ×2, `fact` ×10 | 4 `fact` · 1 `fact-missing` · 1 `fact-tf` | `fact` ×10 |
| `mt-4-8` | Fours and eights | 2 `fact` ×4 (double double) | 4 `fact` · 1 `fact-missing` · 1 `fact-choice` | `fact` ×4 ≤ 5 |
| `mt-3-6-9` | Threes, sixes, nines | `fact` ×3, `fact` ×9 | 4 `fact` · 1 `fact-missing` · 1 `fact-tf` | `fact` ×3 ≤ 5 |
| `mt-7-mixed` | Sevens and mixed | `fact` ×7, `fact` ×0 / ×1 | 4 `fact` (mixed tables) · 1 `fact-missing` · 1 `fact-choice` | `fact` ×7 ≤ 5 |

Race to 20 (`duel`) — **built in `m13.13`** (`minigames/race-to-20.yaml`; game `race`, params `{ target: 20, maxStep: 3 }`): add 1, 2 or 3 to the total; who says 20 wins. The bot moves first from 0 (a kid moving first from 0 loses to perfect play); bot level 1 (40 % mistakes); win once.

| Plan | As built (`m13.13`) |
|---|---|
| World boss of W3 | Not yet: W3 does not exist. `unlockAfter: take-away` (demo world), concept `take-away` (temporary: W3 concepts come in `m13.14`); reached as the Today session's mini-game after Take away (`pickSessionMiniGame`; card-kit subjects have no Play screen). `m13.14` makes it the W3 world boss (id `race-to-20` kept) |
| Hint "Leave a number in the 4 times table" | "Try to land on 4, 8, 12 or 16." (the best step button also glows) |
| Bot | Owl (the unlock lesson's character is not in `MATH_CHARACTERS`; the platform default). Board lines are spoken after each move: "Owl adds 2. Now it's 7." / "You add 1. Now it's 4." (every step and total below 20: 54 + 54 clips) and "Your turn!" |
| Board | number track 0–20 (two rows of 10 on a phone, one row on a tablet), token on the total, last move's stones green (kid) / blue with a paw (bot), +1 +2 +3 buttons (80 px) |

Totals: 16 lessons, 32 guided, 96 scored, ≥ 16 variants, 10 series rounds + 1 duel.

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
| `round-ten` | choice (the 2 tens) | `max` 100 / 1000, `five` | ten | `truncate`, `five-down` | built (m13.9) |
| `round-hundred` | number-entry | `max` 1 000 / 10 000, `five` | hundred | `truncate`, `five-down` | built (m13.9) |
| `round-tf` | true-false | `to` 10 / 100, `max`; "47 → 50" | bool | `truncate`, `five-down` | built (m13.9) |
| `bond-missing` | number-entry | total 10 / 20 / 100; a + □ = total | total − a | `digit-tens` | planned (m13.11) |
| `bond-pairs` | choice (3 pairs) | total | pair | `digit-tens` | planned (m13.11) |
| `double` / `near-double` / `halve` | number-entry | n ≤ 50 / n + (n + 1) / even ≤ 100 | — | `tens-only` | planned (m13.11) |
| `bridge-add` | number-entry (+ line picture in guided) | ones sum 11–18 | a + b | `off-by-one`, `off-by-ten` | planned (m13.11) |
| `count-up` | number-entry | b − a across a ten, difference ≤ 12 | b − a | `off-by-ten` | planned (m13.11) |
| `tens-hundreds` | number-entry | n ± 10 / 100 | — | `wrong-place` | planned (m13.11) |
| `compensate` | number-entry | n ± 9 / 99 | — | `forgot-adjust` | planned (m13.11) |
| `equals-balance` | number-entry | 7 + 5 = 6 + □ | 6 | `answer-next` | planned (m13.11) |
| `story` | number-entry | authored frame (part-whole / change / comparison) × numbers | — | `wrong-op` | planned (m13.11) |
| `groups` | number-entry + emoji groups | k ≤ 5 groups of n ≤ 5 | k × n | `add-factors` | planned (m13.14) |
| `groups-choice` | choice | "3 groups of 4" → 4 + 4 + 4 / 3 + 4 / 3 + 3 + 3 + 3 | 4 + 4 + 4 | `add-factors` | planned (m13.14) |
| `array-build` | array | rows × cols ≤ 6 × 6 (rows fixed by the text) | rows, cols | — | planned (m13.14) |
| `array-commute` | true-false | "3 × 4 = 4 × 3" / "3 × 4 = 3 + 4" | bool | `add-factors` | planned (m13.14) |
| `fact` / `fact-missing` | number-entry | table ∈ set, b 1–10; weighted to the lesson's tables | a × b / b | `neighbour`, `add-factors`, `digit-swap` | planned (m13.14) |
| `fact-choice` / `fact-tf` | choice / true-false | same | — | same | planned (m13.14) |

Bugs (one authored reason sentence each, spoken when the wrong answer matches):

| Bug | Wrong answer | Reason (W1 bugs: the text shipped in `lessons.yaml` `bugs:` by m13.9; the rest are drafts) |
|---|---|---|
| `append` | 2005 for 2 H 0 T 5 O | "Each place holds one digit: 2 hundreds is 200, not 2000." |
| `swap` | 250 for 205 | "Look at the order: hundreds, then tens, then ones." |
| `drop-zero` | 345 for 3000 + 400 + 5 | "An empty place still needs a zero to hold its spot." |
| `ones-first` | compares the last digits | "Compare the biggest place first." |
| `ticks-not-gaps` | counts tick marks | "Count the jumps between the marks, not the marks." |
| `truncate` | rounds down always | "Rounding down every time? Check which number is nearer." |
| `five-down` | 5 rounds down | "Right in the middle? It goes up to the bigger number." |
| `digit-tens` | each digit to 10 (64 → 46) | "The tens make 90, then the ones make 10 more." |
| `tens-only` | doubles the tens only | "Double the tens and the ones." |
| `off-by-one` / `off-by-ten` | ± 1 / ± 10 | "So close! Count the last jump again." / "Check the tens." |
| `wrong-place` | changed the ones | "Ten more changes the tens digit." |
| `forgot-adjust` | + 100 without − 1 | "Adding 99 is adding 100, then taking 1 away." |
| `answer-next` | 7 + 5 = 12 | "The equals sign means both sides are the same." |
| `wrong-op` | added instead of subtracted (or back) | "Read it again: does the number get bigger or smaller?" |
| `add-factors` | 3 + 4 for 3 × 4 | "Times means groups: 3 groups of 4." |
| `neighbour` | a × (b ± 1) | "That's the next fact. Count one group less." |
| `digit-swap` | 42 for 24 | "Check the digits' order." |

### W1 templates as built (`m13.9`)

Code: `packages/subject-math/src/content/templates/` (`numeral`, `bugs`, `place-value`, `compare`, `number-line`, `rounding`, `index` = `MATH_TEMPLATES`); texts: `lessons.yaml` `templates.<id>` (`pv-read-4` / `pv-which-4` for 4 digits) and `bugs.<id>`; tests run every combination of §2 over 1 000 seeds and break every `check` by hand. No lesson uses a template yet (W1 content: `m13.10`); `templates.*` / `bugs.*` are not in the voice inventory until one does.

| Item | As built | Why |
|---|---|---|
| Reason texts `drop-zero`, `truncate`, `five-down` | reworded (table above) | a template zero can sit in the tens or ones; rounding also covers hundreds |
| `pv-which` | also shows the card "2H 0T 5O" | the build-time `check` reads the question from the item; the sentence is not available to it |
| `append` | 3-digit numbers with a zero place; `pv-read` needs it to fit the pad (digits + 1: zero tens only), `pv-which` up to 5 digits; otherwise `pv-which` offers the hundreds / tens swap | place values written one after another are 8 digits for 4 digits: no numeral for a card |
| `cmp-sign` / `cmp-order` / `cmp-tf` `shared` | 0 / 1 / 2 (0 added) | the `pv-compare` variant "different hundreds" |
| `cmp-order` bug | none | the `order` kind has no reasons |
| `nl-half` bug | none | no wrong answer to name |
| `round-ten` line picture | not built | the choice card has no picture slot; `m13.10` decides |
| `round-hundred`, `round-tf` | `five-down` added | a number ending in 50 is half-way |
| `five: false` | no half-way number (ones 5 / ends in 50); `five: true` always | one lever per item |
| Ranges | `round-ten` 11 … max − 1; `round-hundred` 101 … max − 1; `round-tf` the lower neighbour ≥ `to` | no rounding to 0 |
| `nl-place` target | any inner tick, labelled or not (never an end) | an `all` / listed `labels` line is the easier variant |
| `nl-estimate` | target ≥ ¼ step from every tick as specified, but the kind's ± ½ step zone still covers the nearest tick | the zone is fixed by the kind (`tolerance` = step / 2) |
| `pv-read` / `pv-which` text | "1 hundreds", "1 ones" | one `{{h}}` per place, no plural per digit; reword in `m13.10` if the owner minds |

## 4. Rules for the build

| Rule | Where |
|---|---|
| Every template has an independent `check` (re-derives the answer from what the kid sees; unique answer; distinct options; every bug answer ≠ the answer) | template tests over 1 000 seeds |
| Generated items in one entry are distinct; ids are `<stem>-<n>` (never reseed a released lesson: bump the stem) | expander |
| Number-line targets on the line, ticks ≤ 11; estimate tolerance ± ½ interval and no tick at the target | `number-line` verify |
| Place-value targets ≤ 9 999; blocks ≤ 9 per column | `place-value` verify |
| Arrays ≤ 6 × 6 on the grid board | `array` verify |
| Instructions ≤ 14 words; text names what to do ("Build 305 with blocks.") | content tests |
| Content review rule (CLAUDE.md): every choice / true-false text has exactly one reading that leads to the answer | review log in this file |
