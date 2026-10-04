# Math — plan (v1.2, milestone M13)

Target: age 8–9 (Italy classe 3ª–4ª, England Y3–4, US Grade 3–4: the overlap), extension 10–11. Sources: [research.md](research.md) (2026-10-04: UK National Curriculum, CCSS, Indicazioni nazionali 2012 / 2025, EEF, IES practice guides, NCETM mastery, Siegler number-line studies, Outhwaite 2023 app review, Habgood & Ainsworth). Primary documents were read through search excerpts; alignment cells marked (v) in the research need a check.

## 1. Principles

| # | Principle | App rule |
|---|---|---|
| 1 | Concrete → pictorial → abstract | Story / Demo with objects; tries with bars, arrays, number lines; the last 2 scored items of a lesson symbols only |
| 2 | Number sense before procedures | A number line in every world; estimate before compute |
| 3 | Fluency = short spaced retrieval | Leitner review (exists) per concept; 3–5 review items per session, typed, not picked |
| 4 | Worked examples, then fading | Demo = full example; tries leave the last step, then two steps, open |
| 5 | Variation + interleaving | Contrast pairs (× vs ÷); ~30 % of items from earlier concepts |
| 6 | Explanatory feedback | A wrong answer gets one spoken reason tied to its misconception |
| 7 | No anxiety | No visible timers, lives or leaderboards |
| 8 | The game is the skill | Boss = the maths act (build the array, pay the coins), never a quiz gate |

Mastery ≥ 80 % of max stars (exists) = mean ≥ 2.4 per item.

## 2. Curriculum

Full map: 8 worlds, 42 lessons (place value, mental strategies, column methods, multiplication, division, fractions, time / money / measures, geometry / data). v1.2 = the three worlds most used at 8–9:

| World | Lessons (concept id) | Kinds | Boss |
|---|---|---|---|
| W1 Number Meadow — place value | `pv-hto` hundreds / tens / ones (205 ≠ 2005) · `pv-compare` compare and order to 1 000 · `pv-line` number line to 1 000 · `pv-thousands` to 10 000 · `pv-round` round to 10 / 100 | place-value, number-entry, choice, order, number-line | Number Train (series) |
| W2 Mental Math Mountain | `mm-bonds` bonds to 10 / 20 / 100 · `mm-doubles` doubles, near doubles, halves · `mm-bridge` bridging 10 and 100 · `mm-tens` ± 10 / 100, compensation · `mm-problems` add / subtract stories (bar model light) | number-entry, true-false, choice, number-line | Market Orders (series) |
| W3 Times-Table Forest | `mt-groups` equal groups · `mt-arrays` arrays, 3 × 4 = 4 × 3 · `mt-2-5-10` · `mt-4-8` · `mt-3-6-9` · `mt-7-mixed` ×7, ×0, ×1, mixed | array, number-entry, choice, true-false | Race to 20 (2-player vs bot) |

The current demo world (add within 5 / 10, take away) is retired: below the age band. Next versions: column methods, division, fractions, time / money (M13+ patches).

## 3. Exercise kinds

| Kind | Owner | Interaction | Check | Hints 1 / 2 / 3 |
|---|---|---|---|---|
| `number-entry` | platform card kit | Number pad | exact | nudge / first digit / reveal |
| `choice`, `true-false`, `order` | platform card kit | Cards ("47 ◻ 52" with `<` `=` `>` is a choice) | exact | card kit |
| `number-line` | math | Tap a point on a line (labelled ticks exact; estimates within ± ½ interval) | position | benchmark midpoint / more ticks / marker near |
| `place-value` | math | Tap + / − on hundreds / tens / ones columns (blocks drawn); auto-exchange at 10 | column state | column labels / numeral beside blocks / hundreds placed |
| `array` | math | Set rows × columns on a dot grid (tap the corner cell) | rows × cols = target (commuted accepted unless fixed) | "rows go across" / row total / rows filled |

## 4. Generated exercises

Item = template(params) → prompt, answer, distractors tagged by misconception. Generated at content build from a seed (stored), verified by an independent solver: unique answer, distinct distractors. Misconception library → distractors and the spoken reason (e.g. 205 → 2005; 8 + 7 = 14; a × (b ± 1); counts ticks not gaps). Authored: stories, demos, word-problem frames, explanations.

## 5. Platform needs

| Need | Where | Reused by |
|---|---|---|
| Generated exercises: YAML `generate: { template, count, seed, params }` → defs at build, solver-checked | platform-content (generic hook; templates per subject) | Logic (puzzles), Coding (levels) |
| 2-player versus vs a small bot (Race to 20 / Nim) | platform mode (generic `versus` over a subject game) | Logic (Nim, tic-tac-toe) |
| Grid board (arrays) | platform-web `ui/grid` (from M12) | — |

## 6. Iterations (M13)

| Tag | Scope |
|---|---|
| `m13.1` | This plan + `docs/subjects/math/curriculum.md` |
| `m13.2` | Platform generated-exercise hook (content build) + misconception-tagged distractors |
| `m13.3` | Math kinds `number-line`, `place-value`, `array` (core, content, web) |
| `m13.4` | W1 content (generated) + boss; demo world retired |
| `m13.5` | W2 content + boss |
| `m13.6` | Generic 2-player game mode + Race to 20; W3 content; release `v1.2.0` |
