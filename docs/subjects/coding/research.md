# Coding — research notes (ages 8–9, extension 10–11)

Collected 2026-10-04 by a research agent for [plan.md](plan.md); decisions live in the plan.

Evidence note: WebFetch was egress-blocked on every domain tried, so findings come from WebSearch result summaries, not full-text reads. `(bg)` = background knowledge, not verified here. Code.org lesson numbers vary by year.

## 1. Principles for computational thinking at 8-9

| Source | Takeaway |
|---|---|
| [Code.org CSF](https://code.org/en-US/curriculum/computer-science-fundamentals), [Course C](https://curriculum.code.org/csf-20/coursec/), [D](https://curriculum.code.org/csf-20/coursed/) | C (2nd grade): sequencing, debugging, loops, events, then conditionals. D: review, algorithms, nested loops, conditionals, while/until. E (4th): nested loops, conditionals, functions, variables, for-loops. Functions only in grade 4. Maze goes from cardinal arrows (early courses) to relative forward/turn (C onward). |
| ScratchJr / CAL ([Bers](https://www.jite.org/documents/Vol18/JITEv18IIPp113-138Bers5788.pdf), [CAL 2nd grade](https://sites.bc.edu/codingasanotherlanguage/curricula/scratchjr-curricula/2nd-grade-scratchjr/), [usage study](https://sites.bc.edu/devtech/wp-content/uploads/sites/181/2023/10/s11423-021-10011-w.pdf)) | K sequencing, 1st repeat, 2nd loops + conditionals. Ages 5-7 master repeat-N, struggle with if-then. Debugging and goal-directed programming from day one. |
| [Grade 1-3 study, n=517](https://www.mdpi.com/2227-7102/16/4/604), [cognitive demands](https://link.springer.com/chapter/10.1007/978-3-030-97986-7_3) | Sequences > loops > conditionals (grade 3: 0.83 / 0.68 / lower). |
| [Bakala review, ages 3-6](https://pmc.ncbi.nlm.nih.gov/articles/PMC9524457/) | Sequences and events are the early core; toys mostly hide conditionals (implicit). We show them explicitly. |
| [Lightbot](https://www.commonsensemedia.org/app-reviews/lightbot-programming-puzzles), [Gouws et al.](https://www.researchgate.net/publication/262399549_Computational_thinking_in_educational_activities_An_evaluation_of_the_educational_game_Light-Bot) | Basics, Procedures, Loops (Code Hour); full game adds Overloading, Conditionals. Code Hour loops are recursion, not a repeat block. |
| [Kodable](https://www.gettingsmart.com/2013/06/28/kodable-the-first-step-in-coding/) | Text-free; absolute arrows; colored arrow = "if red square"; loop = bracket + count; "Function Junction". |
| [CS Unplugged](https://classic.csunplugged.org/activities/), [Barefoot](https://www.barefootcomputing.org/docs/default-source/at-home/quick--guide-to-computational-thinking.pdf), [Bebras](https://www.researchgate.net/publication/308499063_It's_Computational_Thinking_Bebras_Tasks_in_the_Curriculum) | Unplugged: human robot (Harold), treasure-hunt state machine. Barefoot: algorithms, decomposition, abstraction, patterns, evaluation, logic. Bebras: text-light "what happens / which one" puzzles. |
| [UK KS2](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/239033/PRIMARY_national_curriculum_-_Computing.pdf), [CSTA 1B](https://csteachers.org/wp-content/uploads/2025/03/csta-k-12-computer-science-standards-revised.pdf) | KS2: debug, decompose, sequence/selection/repetition, variables, explain algorithms. 1B: AP-10 sequences/events/loops/conditionals; AP-11 decompose; AP-12 modify/remix; AP-15 test and debug; AP-09 variables; AP-08 compare algorithms. |

Decisions:
1. Sequence first; debugging from lesson 1 (a bug is a normal event, never a "fail").
2. Read before write ([PRIMM](https://computingeducationresearch.org/projects/primm/), used with 8-9 year olds). Story = hook, Demo = predict then watch, guided tries = investigate/modify, scored = make, boss = free make.
3. Each construct is born from a felt pain: loop after repeating tiles, function after repeating a chunk, conditional after a program that breaks on another board.
4. Unplugged cards (order steps, patterns) are real exercises: primary effect similar to plugged beyond 4 weeks ([meta-analysis](https://link.springer.com/article/10.1007/s11423-025-10522-w)).
5. Explicit debugging teaching works at 8-9 and transfers ([study](https://dl.acm.org/doi/10.1145/3769994.3769999)); hints help ([study](https://arxiv.org/pdf/2108.07052)).
6. Difficulty knobs: turns, total steps, needing loop/conditional blocks ([Kodetu, 326 learners](https://ceur-ws.org/Vol-3029/paper02.pdf)).
7. One new tile or idea per lesson; tray <= 8 tiles.

Concept order: sequence > debug > repeat N > relative turns + loop > events > nested loop > if/else on sensor > while/until > functions (no params) > [ext] variables, parameters, boolean logic.

Too early at 8-9: arithmetic variables, counters in loop conditions, for-loop index, and/or/not, nested conditionals, recursion, parameters, concurrent events, text syntax. Functions are borderline ([Rose et al.](https://journals.sagepub.com/doi/10.1177/0735633120932871): procedural abstraction hard for novices, studied at 10+): last core world, no parameters.

## 2. Proposed curriculum (7 core worlds, 29 lessons, + extension)

Exercise codes (section 3): **BP** build program, **PR** predict end, **FB** find bug, **FX** fix program, **FM** fill missing step, **OS** order steps, **PL** pattern to loop, **CP** choose program, **WR** wire the remote, **MB** multi-board build.

Tiles: W1 arrows + pick up; W2 repeat; W3 forward / turn L / turn R / jump; W4 events; W5 nested repeat; W6 if, if-else, while/until, sensors; W7 function.

| Id | Title | Child learns | Exercises | Boss |
|---|---|---|---|---|
| **W1 Meadow Steps (absolute arrows)** | | | | |
| seq-order | Steps in order | Algorithm = exact steps; order changes the result | OS, CP | Recipe Rush |
| seq-arrows | Walk the path | Arrow = 1 step; read left to right | BP, PR, CP | Recipe Rush |
| seq-collect | Collect stars | Plan around walls; pick up is a step | BP, FM, PR | Star Trail |
| seq-debug | Bug hunt | Bug = one wrong step; test, find, fix | FB, FX | Bug Squash |
| **W2 Looping Hills (repeat N, arrows)** | | | | |
| loop-pattern | See the pattern | Spot repeating chunks | PL, OS | Drum Beat |
| loop-repeat | Repeat N | One tile, N times in all | BP, PR, CP | Drum Beat |
| loop-chunk | Repeat a chunk | Body of 2-3 tiles (staircase) | BP, PL, FM | Fence Builder |
| loop-debug | Loop bugs | Wrong count, wrong chunk | FB, FX, PR | Bug Squash |
| **W3 Turning Woods (relative)** | | | | |
| turn-facing | Which way am I facing? | Turn rotates in place; heading persists | PR, CP | Left-Right Rescue |
| turn-build | Forward and turn | Turn L/R from the animal's view | BP, PR | Left-Right Rescue |
| turn-loop | Turns in loops | repeat [forward, turn] (squares, zigzags) | BP, PL, FM | Mirror Mouse |
| turn-jump | Jump the gap | Jump = 2 tiles, 1 step | BP, FM, PR | Mirror Mouse |
| turn-debug | Mirror bugs | L/R swapped, missing turn | FB, FX | Bug Squash |
| **W4 Remote Town (events)** | | | | |
| event-when | When I tap | "When button, do stack"; nothing runs before the event | WR, PR | Puppet Show |
| event-many | Many buttons | Tap order is the program | WR, PR, CP | Puppet Show |
| event-debug | Wrong button | Wrong stack on a button | FB, FX | Puppet Show |
| **W5 Echo Canyon (nested loops)** | | | | |
| nest-rows | Row by row | Loop in a loop = rows x columns | BP, PR, PL | Garden Rows |
| nest-grid | Fill the grid | Choose body, inner, outer count | BP, PL, FM | Garden Rows |
| nest-debug | Nested bugs | Wrong nesting level, swapped counts | FB, FX, PR | Bug Squash |
| **W6 Crossroads (if / else, while)** | | | | |
| if-sensor | Wall ahead? | If sensor true, act; else skip | PR, BP | Sensor Safari |
| if-else | This or that | Exactly one branch runs | BP, CP, PR | Sensor Safari |
| if-loop | Loop + decide | repeat [if wall turn else forward]; one program, many boards | MB, FM | Sensor Safari |
| while-until | Until | Repeat until wall/star; unknown count | BP, PR, CP | Sprint to the Wall |
| while-if | While + if | while [if on star pick up; forward] | MB, FM | Sprint to the Wall |
| decide-debug | Decision bugs | Wrong sensor/branch, if vs while | FB, FX | Bug Squash |
| **W7 Builder's Workshop (functions, no params)** | | | | |
| fn-name | Name a chunk | Name a chunk used twice (decompose) | PL, BP | Dance Studio |
| fn-call | Call it | Define once, call many | BP, PR, CP | Dance Studio |
| fn-mix | Function + loop | Call inside repeat; function with if | BP, FM | Dance Studio |
| fn-debug | Fix once | Bug in function breaks every call | FB, FX | Bug Squash |

**Extension (10-11)**
- W8 Counter Cove: variables/counters (+1 per star, show number, repeat until counter = 3), function parameters `walk(n)`, compare two programs.
- W9 Logic Peaks: and/or/not sensors, nested if, else-if chain, nested functions, compound loop conditions, remix a given program, build a level for a friend, read a program as text.

Sizing: 29 lessons x 12-15 min is about 6-7 h, 10-12 weeks at 2-3 sessions per week. Review resamples earlier exercises from the generator.

## 3. Exercise-type catalogue (tap/drag)

Scoring: error = failed run, wrong tap or wrong card. 3 stars = no hint, no error; 2 = 1 error or L1 hint only; 1 = otherwise. Always completes. Efficiency = **slot cap** (optimal + 0-1 for compression lessons, + 3-4 otherwise), not a star penalty; optimal length earns a "Neat Coder" badge.

Hint ladder: L1 narrated nudge + highlight; L2 narrow the choice (ghost next tile, drop wrong options); L3 show the answer, child redoes it (1 star max).

| Type | Interaction | Machine check | Hints (L1 / L2 / L3) |
|---|---|---|---|
| **BP** | Drag tiles into slots; Run | Simulator over (x, y, heading, stars held); success = goal state, no bump; accept any correct program. BFS = straight-line optimum; enumerative search = loop optimum | "first star: which way?" / ghost next 1-2 tiles / demo, child rebuilds |
| **PR** | Read-only program; tap end square (variants: tap every visited square; "will it bump?") | Simulator. Distractors by mutation: loop +/-1, L/R swapped, jump ignored, last tile dropped | run first 2 steps / step to where the tap diverges / full run, tap again |
| **FB** | Goal path dotted; run fails; tap the wrong tile | Bug = single mutation of a known solution; accepted tile = first step leaving the goal path; reject mutants that pass or hide the bug | slow replay highlighting departure / grey out all but 3 tiles / flash tile |
| **FX** | Prefilled buggy program; replace, delete, reorder; Run | As BP + edit distance <= 2 from reference | as FB L1 / name bug type in words / show fixed tile |
| **FM** | 1-2 holes; 3-4 candidate tiles | Simulate every candidate; exactly one passes | narrate segment goal / remove 2 wrong / place it, child confirms |
| **OS** | 4-6 picture cards of an everyday routine; drag into order | Authored precedence DAG; accept any linear extension | highlight first card / lock correct cards / play routine |
| **PL** | Long straight program or beat row; select repeating chunk, set count (2-9) | Trace equivalent to original + slot cap; unique smallest compression by search | bracket on chunk / bracket + count choice / loop inserted, count empty |
| **CP** | Goal animation or end state; 3 program cards (variant: "which two do the same?") | Simulate all; exactly one passes; misconception mutants as distractors | preview card's first 2 steps / remove 1 wrong / remove 2 |
| **WR** | Drag stacks onto buttons, then tap-order challenge | Event simulator | as BP |
| **MB** | One program runs on 3-5 boards | Simulate all; hard-coded solutions fail | show failed board / show sensor to use / demo |

## 4. Mini-games / bosses (one skill each)

| Boss | Skill | Mechanic |
|---|---|---|
| Recipe Rush | sequence | 5 animal customers, picture-card orders; lives, no timer |
| Star Trail | path planning | 3 boards, shrinking slot cap |
| Bug Squash | debugging | 6 programs run in turn; tap the bad tile; 3 lives |
| Drum Beat | loop = pattern | Compress a rhythm with repeat |
| Fence Builder | loop compression | Cap drops each round (12, 8, 6) |
| Left-Right Rescue | relative turns | Animal faces toward, away, sideways; program from its view |
| Mirror Mouse | turn + loop | Reproduce a shown trail with one repeat |
| Puppet Show | events | 3 buttons; perform a requested show |
| Garden Rows | nested loops | Plant rows x cols seeds, fewest tiles |
| Sensor Safari | if/else | One program crosses 3 hidden corridors |
| Sprint to the Wall | while/until | Unknown length; collect stars on the way |
| Dance Studio | functions | Define a combo; call it 4 times; tile cap |
| Counter Cove (ext) | variables | Stop at exactly N stars |

Bosses are optional, bonus stars only, with an uncapped sandbox: structured debugging teaching gave more learning, an unstructured group more engagement ([study](https://www.mdpi.com/2227-7102/15/3/292)).

## 5. Command set, execution, misconceptions

**Absolute vs relative: absolute arrows in W1-W2, relative from W3.**
- Absolute: one tile = one visible step, no hidden heading. Kodable route; Code.org goes cardinal first, relative from Course C.
- Relative is required for sensors ("wall ahead") and turtle-style loops; introduce once loops are secure.
- Bee-Bot research: children switch reference frames ([study](https://cehs.usu.edu/itls/projects/pel/files/clarkemidura2021.pdf)) and conflate turn with step (role-play report, attribution unconfirmed). turn-facing isolates the turn.
- Mitigation: animal with visible face/heading arrow; 90-degree in-place turn animation as its own step; curved-arrow icons plus the animal's matching paw highlighted (not color alone); voice "turn to YOUR left paw". Optional "animal-up" camera, off by default.

**Block limits.** Strip <= 12 visible slots, no scrolling; nesting <= 2 until W5; tray <= 8 tiles, one new per lesson; function body strip <= 6 slots. Lightbot stars use command counts (search summary); we use caps.

**Execution display.**
- ~0.7 s per step; turtle/rabbit toggle; **Step** button; Pause/Stop/Reset keeps the program.
- Current tile glows in sync with the animal (Code.org Maze does this).
- Loop badge "2 of 3"; nested loops show two badges.
- If shows an eye check (tick/cross); untaken branch fades (Code.org: signal wave).
- Function call: body flies in below, then returns.
- Footprint trail; failure = bump animation, soft sound, ghost of the intended path, voice "bumped the wall at step 4".

| Misconception | Where | Countermeasure |
|---|---|---|
| "Left" = child's left | W3 | Animal's paw highlighted; turn-facing PR |
| Turn also moves; heading forgotten | W3 | In-place rotation; persistent heading arrow; PR distractor = heading ignored |
| Repeat 3 runs 4 or 2 times ([loop misconceptions](https://www.researchgate.net/publication/321332296_Comparing_loops_misconceptions_in_block-based_and_text-based_programming_languages_at_the_K-12_level)) | W2 | Badge; voice "three times in all"; PR distractors +/-1 |
| Only first tile repeats (scope) | W2 | C-shaped block, whole body tinted |
| Nested loops "run together"; chained instead of nested | W5 | Two badges; "unrolled" toggle |
| If always runs / both branches run; while = if | W6 | Eye check; faded branch; check shown every turn |
| Function call = copy-paste | W7 | Fly-in/return; fn-debug "fix once" |
| Hard-coded answer passes | W6 | MB exercises |

## 6. Content generation

| Content | Auto? | Guarantee | Authored part |
|---|---|---|---|
| Grid levels | Yes, template-first: pick a concept template (staircase = repeat [right, up]), derive the board from its program | Solvable by construction; BFS/enumeration check; concept necessary (no non-loop solution within the cap); no decor objects | First-exposure levels per concept |
| PR | Yes | Simulator answer; mutation distractors deduped | Wording templates |
| FB / FX | Yes | Failing mutants only, unique first divergence | Feedback sentence per bug type |
| FM / CP | Yes | Exactly one candidate passes | Misconception-to-feedback map |
| PL | Yes | Unique smallest compression | Rhythm/pattern art |
| MB | Yes | Reference passes all boards; unconditional program of cap size fails >= 1 | First-lesson boards |
| OS | **No** | DAG acyclic, single-answer readings | Cards, DAG, narration |
| Events, functions | Partly | Simulator verifies | Stage design, shared sub-sequences |
| Story, voice, art, bosses | **No** | n/a | All |

Method: [task synthesis for Hour of Code mazes](https://dl.acm.org/doi/abs/10.5555/3495724.3497598), [subtask progression](https://arxiv.org/pdf/2305.17518) (simpler subtasks could drive hint L2). Content build runs solver + validator; fails on unsolvable, ambiguous or cap-violating items. Per `docs/retrospective.md` §9, each validator rule gets a failing fixture (e.g. an ambiguous exercise that must be rejected). Store seeds, not boards. Review rule: read each question against its board for exactly one reading.

## 7. Pitfalls and playtest evidence

- **Lightbot:** gets hard fast; restart is the only help ([Common Sense](https://www.commonsensemedia.org/app-reviews/lightbot-programming-puzzles)). Counter: hint ladder, loops before procedures, real repeat block.
- **Trial and error dominates novice debugging** ([study](https://www.mdpi.com/2227-7102/15/3/292)). Counter: errors cost stars, staged hints, predict-before-run in guided tries.
- **Conditionals are hardest.** Counter: explicit eye sensor, one sensor at a time, MB.
- **Block overload:** children with a year of Scratch still struggle to find blocks (search summary). Counter: <= 8 tiles.
- **Stars for fewest blocks punish learners.** Counter: caps + badge.
- **Reading load:** voice everything; picture cards.
- **Wording ambiguity** (project playtest, "closest to you"): narrate from the animal's view.
- **Memorized solutions:** seeds, MB, review resampling.
- **Log in playtest:** first-run success per type, failed runs, hint level, time, bug-type misses; set targets first (e.g. first-run success >= 60%).
- **Gap:** no published Kodable playtest found; Lightbot evidence is review-level, not controlled.
