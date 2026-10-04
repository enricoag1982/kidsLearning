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

Race to 20 (`duel`): add 1, 2 or 3 to the total; who says 20 wins. The bot moves first from 0 (a kid moving first from 0 loses to perfect play); world boss at bot level 1 (40 % mistakes); hint: "Leave a number in the 4 times table"; win once.

Totals: 16 lessons, 32 guided, 96 scored, ≥ 16 variants, 10 series rounds + 1 duel.

## 3. Templates

Kinds: card kit `choice` / `true-false` / `number-entry` / `order`; math `number-line` / `place-value` / `array` (plan §3).

| Template | Kind | Params (difficulty levers) | Answer | Bugs |
|---|---|---|---|---|
| `pv-build` | place-value | digits 3 / 4, zero in none / tens / ones | n | — |
| `pv-read` | number-entry | "2 hundreds, 0 tens, 5 ones" | n | `append`, `swap` |
| `pv-which` | choice (3 numerals) | same text | n | `append`, `swap` |
| `pv-expanded` | number-entry | "3000 + 400 + 5" | n | `drop-zero` |
| `cmp-sign` | choice `<` `=` `>` | a, b share 1–2 leading digits; digits 3 / 4 | sign | `ones-first` |
| `cmp-order` | order (4 numerals, smallest first) | shared leading digits | order | `ones-first` |
| `cmp-tf` | true-false | "406 > 460" | bool | `ones-first` |
| `nl-place` | number-line | from, to, step 1 / 10 / 50 / 100, target on a tick | position | `ticks-not-gaps` |
| `nl-estimate` | number-line | target between ticks, ± ½ interval | position | — |
| `nl-half` | number-entry | "halfway between 300 and 400" | 350 | `ticks-not-gaps` |
| `round-ten` | choice (the 2 tens) + line picture | n, ones = 5 lever | ten | `truncate`, `five-down` |
| `round-hundred` | number-entry | n | hundred | `truncate` |
| `round-tf` | true-false | "47 rounds to 50" | bool | `truncate` |
| `bond-missing` | number-entry | total 10 / 20 / 100; a + □ = total | total − a | `digit-tens` |
| `bond-pairs` | choice (3 pairs) | total | pair | `digit-tens` |
| `double` / `near-double` / `halve` | number-entry | n ≤ 50 / n + (n + 1) / even ≤ 100 | — | `tens-only` |
| `bridge-add` | number-entry (+ line picture in guided) | ones sum 11–18 | a + b | `off-by-one`, `off-by-ten` |
| `count-up` | number-entry | b − a across a ten, difference ≤ 12 | b − a | `off-by-ten` |
| `tens-hundreds` | number-entry | n ± 10 / 100 | — | `wrong-place` |
| `compensate` | number-entry | n ± 9 / 99 | — | `forgot-adjust` |
| `equals-balance` | number-entry | 7 + 5 = 6 + □ | 6 | `answer-next` |
| `story` | number-entry | authored frame (part-whole / change / comparison) × numbers | — | `wrong-op` |
| `groups` | number-entry + emoji groups | k ≤ 5 groups of n ≤ 5 | k × n | `add-factors` |
| `groups-choice` | choice | "3 groups of 4" → 4 + 4 + 4 / 3 + 4 / 3 + 3 + 3 + 3 | 4 + 4 + 4 | `add-factors` |
| `array-build` | array | rows × cols ≤ 6 × 6 (rows fixed by the text) | rows, cols | — |
| `array-commute` | true-false | "3 × 4 = 4 × 3" / "3 × 4 = 3 + 4" | bool | `add-factors` |
| `fact` / `fact-missing` | number-entry | table ∈ set, b 1–10; weighted to the lesson's tables | a × b / b | `neighbour`, `add-factors`, `digit-swap` |
| `fact-choice` / `fact-tf` | choice / true-false | same | — | same |

Bugs (one authored reason sentence each, spoken when the wrong answer matches):

| Bug | Wrong answer | Reason (draft) |
|---|---|---|
| `append` | 2005 for 2 H 0 T 5 O | "Each place holds one digit: 2 hundreds is 200, not 2000." |
| `swap` | 250 for 205 | "Look at the order: hundreds, then tens, then ones." |
| `drop-zero` | 345 for 3000 + 400 + 5 | "No tens? Put a zero in the tens place." |
| `ones-first` | compares the last digits | "Compare the biggest place first." |
| `ticks-not-gaps` | counts tick marks | "Count the jumps between the marks, not the marks." |
| `truncate` | rounds down always | "Which ten is nearer? Look at the ones." |
| `five-down` | 5 rounds down | "A five goes up to the next ten." |
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
