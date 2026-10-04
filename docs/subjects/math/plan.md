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
| `place-value` | math | Tap + / − on (thousands /) hundreds / tens / ones columns (blocks drawn); 0–9 per column, no auto-exchange in v1.2 (+ disabled at 9; lead 2026-10-04: exchange is a column-method idea, W3 Column Canyon) | column state | column labels / numeral beside blocks / highest column filled |
| `array` | math | Set rows × columns on a dot grid (tap the corner cell) | rows × cols = target (commuted accepted unless fixed) | "rows go across" / row total / rows filled |

## 4. Generated exercises

Item = template(params) → prompt, answer, distractors tagged by misconception. Generated at content build from a seed (stored), verified by an independent solver: unique answer, distinct distractors. Misconception library → distractors and the spoken reason (e.g. 205 → 2005; 8 + 7 = 14; a × (b ± 1); counts ticks not gaps). Authored: stories, demos, word-problem frames, explanations. Lesson-level list: [curriculum.md](curriculum.md).

Decisions (lead 2026-10-04, from a code read of the content pipeline):

| # | Decision | Why |
|---|---|---|
| G1 | YAML entry `- id: <stem>` + `generate: { template, count, seed, params }` in any guided / exercises / variants / series rounds slot; expands at build into ordinary defs, then every existing verify rule runs | snapshot, voice inventory, i18n unchanged |
| G2 | Texts interpolated at build into generated keys `lessons:gen.<id>.<name>` in every language (numbers formatted per language); no runtime `textParams` | generated audio needs every concrete text ahead of time |
| G3 | Ids `<stem>-1 … -<count>`, independent of the seed; never reseed a released lesson (bump the stem) | stored stars stay attached to the same item |
| G4 | Variety on retry / review = the build-time pool (variants, review), not new numbers at runtime | audio is pre-generated |
| G5 | Reason = `reasonKey` on the def (choice option, number-entry `reasons: [{ value, reasonKey }]`, true-false); the card notes speak it instead of the default wrong note; bug ids are authoring names only | smallest generic change; any card subject can use it |
| G6 | Card-kit notes enter the voice inventory (`cardVoiceTemplates`): number-entry notes have no generated audio today | Coding / Template / Math share it |
| G7 | Math moves onto the card kit (`createCardCore` like Coding); its demo kinds (problem card, pad 0–99) go | one kit; pad 5 digits for 10 000 |
| G8 | Retired content is tolerated: warm-up drops concepts with no exercise left (today they starve it), Practice and the parent report list only content concepts; total stars keep retired lessons' stars ("nothing is lost") | the demo world `adding` retires; legacy `math-demo` backups import as before |

## 5. Platform needs

| Need | Where | Reused by |
|---|---|---|
| Generated exercises (G1–G4): `platform-content/src/generate/` (template type, expander, generated texts), subject `templates` registry, seeded `random` helpers | platform-content, platform-core `domain/random.ts` | Logic (puzzles), Coding (levels) |
| Reasons (G5) + card voice templates (G6) | platform card kit (core, content, web) | all card subjects |
| Turn-based `duel` mode vs a bot: subject supplies a pure `TurnGame` (`start`, `toMove`, `moves`, `play`, `result`, `bestMoves`); bot = best move unless a level's mistake rate (40 / 20 / 0 %) fires; win = 3 stars; opt-in factories (`createDuelMode`, `createDuelContent`, `createDuelModeUi`); id `duel`, not `versus` (the boss step looks up platform modes first: `versus` would take over chess Pawn Wars) | platform-core / content / web `modes/duel/` | Logic (Nim, tic-tac-toe) |
| Grid board (arrays) | platform-web `ui/grid` (from M12) | — |

## 6. Iterations (M13)

Re-cut 2026-10-04 (one concern per iteration, ≤ 4 commits):

| Tag | Scope |
|---|---|
| `m13.1` | This plan + `curriculum.md` (lessons, templates, bugs) |
| `m13.2` | Generated-exercise hook (G1–G4) with a card-fixture template |
| `m13.3` | Reasons (G5) + card voice templates (G6) |
| `m13.4` | Retired-content tolerance (G8) + a recorded kids-learning storage fixture with math-demo progress |
| `m13.5` | Math onto the card kit (G7); demo world kept, same texts; pad 5 digits |
| `m13.6` | `number-line` kind |
| `m13.7` | `place-value` kind |
| `m13.8` | `array` kind (grid board) |
| `m13.9` | W1 templates + solvers + bugs |
| `m13.10` | W1 content + Number Train; `adding` retired |
| `m13.11` | W2 templates + content + Market Orders |
| `m13.12` | Platform `duel` mode |
| `m13.13` | Race to 20 + W3 world boss |
| `m13.14` | W3 templates + content |
| `m13.15` | Release `v1.2.0` |
