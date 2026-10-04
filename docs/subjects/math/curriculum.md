# Math — curriculum (v1.2: W1 shipped in `m13.10`; W2 in `m13.11`, W3 in `m13.14`)

Lesson / exercise design for W1–W3 of [plan.md](plan.md) §2. A world's rows are its plan until its iteration lands, then what shipped (like `docs/subjects/coding/curriculum.md`), plus the content review log (§6). W1 Number Meadow is shipped (`m13.10`); W2 and W3 are still the plan.

## 1. Shape

| Item | Rule |
|---|---|
| Track | main `numbers` ("Number Adventures"): W1 `number-meadow` (habitat `meadow`), W2 `mental-mountain` (`mountains`), W3 `times-forest` (`forest`). The demo world `adding` retired in `m13.10` (§2 W1) |
| Characters | Owl narrates; the Hedgehog teaches (every lesson; the math demo's character and the hub icon) |
| Ranks | `counter` (start) → `builder` (W1) → `climber` (W2) → `multiplier` (W3) |
| Lesson | story 2–3 sentences (Owl + Hedgehog, the rule), demo = full worked example (fading: guided 1 leaves the last step, guided 2 two steps), 2 guided, 6 scored, ≥ 1 easier variant for the hardest scored item, concept = lesson id |
| CPA | guided and the first 4 scored may show pictures (blocks, line, groups, array); the last 2 scored are symbols only (W1: all lessons but `pv-line`, whose table has one symbol item, `nl-half`, last) |
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

Number Train (`number-train`, `series`, `errors3: 0`, `errors2: 2`, concept `pv-line`, `unlockAfter: pv-round`, title "Number Train", goal "Put every carriage number where it belongs on the line!"): 5 rounds, the carriage number goes where it belongs: `nl-place` step 100 → 50 → 10 (only the ends numbered), then 2 `nl-estimate` (0–1000, numbers at 0, 500, 1000). It is the world boss on the Journey once the five lessons are done, and the Today session's mini-game before Race to 20.

Ranks `counter` (start) → `builder` (after `world:number-meadow`). Badges: `number-builder` ("Number Builder": `mastered` `world:number-meadow`, "Master Number Meadow and beat Number Train"), `star-counter` (`stars-total` 10 / 30, generic). Race to 20 (below) is re-pointed to `pv-round` (concept and `unlockAfter`) until `m13.14`.

Retired in `m13.10`: the demo world `adding` (lessons `add-within-5`, `add-within-10`, `take-away`, boss `number-parade`, rank `adder`, badge `first-sums`, their texts). Stored progress for them is tolerated (G8, `m13.4`): the backup / merge keep it, total stars count it ("nothing is lost"), no Journey node, warm-up and Practice ignore its concepts (`apps/kids-learning/src/retired-content.test.tsx`, e2e `math/backup.spec.ts`).

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
| World boss of W3 | Not yet: W3 does not exist. `unlockAfter: pv-round`, concept `pv-round` (`m13.10`; `m13.13` had `take-away`; temporary: W3 concepts come in `m13.14`); reached as the Today session's mini-game after Rounding and the Number Train (`pickSessionMiniGame`; card-kit subjects have no Play screen). `m13.14` makes it the W3 world boss (id `race-to-20` kept) |
| Hint "Leave a number in the 4 times table" | "Try to land on 4, 8, 12 or 16." (the best step button also glows) |
| Bot | the unlock lesson's character: Owl up to `m13.13` (`take-away`); since `m13.10` the Hedgehog (`pv-round`), "Hedgie". Board lines are spoken after each move: "Hedgie adds 2. Now it's 7." / "You add 1. Now it's 4." (every step and total below 20: 54 + 54 clips) and "Your turn!" |
| Board | number track 0–20 (two rows of 10 on a phone, one row on a tablet), token on the total, last move's stones green (kid) / blue with a paw (bot), +1 +2 +3 buttons (80 px) |

Totals (plan): 16 lessons, 32 guided, 96 scored, ≥ 16 variants, 10 series rounds + 1 duel. Shipped so far: W1 (5 lessons, 5 rounds) + the duel.

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

Code: `packages/subject-math/src/content/templates/` (`numeral`, `bugs`, `place-value`, `compare`, `number-line`, `rounding`, `index` = `MATH_TEMPLATES`); texts: `lessons.yaml` `templates.<id>` (`pv-read-4` / `pv-which-4` for 4 digits) and `bugs.<id>`; tests run every combination of §2 over 1 000 seeds and break every `check` by hand. The W1 lessons use them since `m13.10` (§5): a template text is narrated only in its filled-in form (`lessons:gen.<id>.text`), a bug text when some exercise can speak it (all 7 are).

| Item | As built | Why |
|---|---|---|
| Reason texts `drop-zero`, `truncate`, `five-down` | reworded (table above) | a template zero can sit in the tens or ones; rounding also covers hundreds |
| `pv-which` | also shows the card "2H 0T 5O" | the build-time `check` reads the question from the item; the sentence is not available to it |
| `append` | 3-digit numbers with a zero place; `pv-read` needs it to fit the pad (digits + 1: zero tens only), `pv-which` up to 5 digits; otherwise `pv-which` offers the hundreds / tens swap | place values written one after another are 8 digits for 4 digits: no numeral for a card |
| `cmp-sign` / `cmp-order` / `cmp-tf` `shared` | 0 / 1 / 2 (0 added) | the `pv-compare` variant "different hundreds" |
| `cmp-order` bug | none | the `order` kind has no reasons |
| `nl-half` bug | none | no wrong answer to name |
| `round-ten` line picture | not built (decided `m13.10`): the guided `round-ten` tries are plain choice cards; the story and demo say "closer to 50 than to 40", the Number Train and `pv-line` carry the line | the choice card has no picture slot (a platform change, out of scope) |
| `round-hundred`, `round-tf` | `five-down` added | a number ending in 50 is half-way |
| `five: false` | no half-way number (ones 5 / ends in 50); `five: true` always | one lever per item |
| Ranges | `round-ten` 11 … max − 1; `round-hundred` 101 … max − 1; `round-tf` the lower neighbour ≥ `to` | no rounding to 0 |
| `nl-place` target | any inner tick, labelled or not (never an end) | an `all` / listed `labels` line is the easier variant |
| `nl-estimate` | target ≥ ¼ step from every tick as specified, but the kind's ± ½ step zone still covers the nearest tick | the zone is fixed by the kind (`tolerance` = step / 2) |
| `pv-read` / `pv-which` text | fixed in `m13.10`: every non-zero place count is drawn from 2–9 (0 stays: "0 tens"), `check` rejects a card with a 1, a 1 000-seed test asserts no text says "1 hundreds" / "1 tens" / "1 ones" / "1 thousands" | the resolver pluralises one `count` var, not one per place; `pv-build` (no plural) still draws 1–9 |
| `round-easy` "far from the middle" | no template lever: the stored seed draws 31 (ones 1, 2, 8 or 9), a test pins it | one lever per item; a `far` param is not worth a template change |

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

## 5. W1 exercises (as shipped, `m13.10`)

Columns: generated id (`<stem>-<n>`, from the entry's `id`); template and stored seed (params in the YAML; **never change a seed or a count of a released lesson**: stored stars sit on the ids, tests pin them: `src/content/number-meadow.test.ts`); the card as drawn; the answer (the right option in bold); what it practises. Texts: [lessons.yaml](../../../packages/subject-math/content/locales/en/lessons.yaml) (`templates.*`, `bugs.*`, the lessons' story / demo).

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

## 6. Content review log

CLAUDE.md rule: every choice / true-false / setup text is checked against its card so exactly one reading leads to the accepted answer; no distractor items. The checks are run on the shipped cards by `src/content/number-meadow.test.ts` (re-derived from the compiled defs, not through the templates' own `check`) and over 1 000 seeds per template combination.

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

Manual checks still open (owner, `docs/release.md` §1): a child's first run of `pv-hto` (blocks on the iPad / Android tablet), the number line with a finger on a phone.
