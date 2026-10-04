# Logic & puzzles — research notes (ages 8–9, extension 10–11)

Collected 2026-10-04 by a research agent for [plan.md](plan.md); decisions live in the plan.

Source note: web search only; journal pages blocked fetch, so figures come from search summaries. Ostad's primary papers not opened.

## 1. Principles

| Skill at 8–9 | Status | Design rule | Source |
|---|---|---|---|
| Classification, seriation, reversibility | Present (Piaget concrete-operational, ~7–11); weak with abstract content | One attribute → two (Carroll 2×2) → overlap (Venn). Pictures, not symbols. Free undo | [Piaget summary](https://www.simplypsychology.org/concrete-operational.html), [Venn/Carroll progression](https://www.oise.utoronto.ca/robertson/lesson-plans/introduction-venn-diagrams) |
| Stage theory limits | Piaget underestimates children when tasks lack human sense; scaffolds extend limits (Donaldson) | Story framing ("hide from the fox"), demo before tries | [Three-mountain critique](https://en.wikipedia.org/wiki/Three_mountain_problem) |
| Patterns | Core unit of repeat grows ABAB → ABB/ABC; growing patterns by grades 3–4 | Repeat → number steps → growing → "10th item" | [387-pupil study](https://link.springer.com/article/10.1007/s10649-025-10464-3), [NRICH](https://nrich.maths.org/articles/developing-pattern-awareness-young-children) |
| Analogies | Possible earlier than Piaget claimed if the relation is familiar; limited by working memory | Familiar relations only (part-of, bigger-of, young-of), one relation per item | [Goswami 1991](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-8624.1991.tb01511.x) |
| If–then | From ~8: modus ponens OK; "not sure" for affirming-the-consequent when alternatives are easy to imagine. Causal conditionals stable only at 10–12 | Category rules with pictures ("if it has wings…"), counter-example hunting. Modus tollens = extension | [Markovits 2016 (8–10)](https://www.sciencedirect.com/science/article/abs/pii/S0885201416301800), [primary conditionals](https://pmc.ncbi.nlm.nih.gov/articles/PMC7658316/) |
| Spatial | 2D rotation trainable; mirror images are the hard part; 3D cube rotation near chance for many 7–10 year-olds | 2D first; teach mirror vs turn explicitly; 3D rotation = extension | [Hawes 2015](https://onlinelibrary.wiley.com/doi/10.1111/mbe.12051), [Uttal 2013 (g≈0.47, 217 studies)](https://www.semanticscholar.org/paper/The-malleability-of-spatial-skills:-a-meta-analysis-Uttal-Meadow/3e043ee9e42649bde6f9232f6ef27e6d77f79025) |
| Planning | Hanoi 2 discs ≈ ceiling at 8; 3 discs in transition at 7–9; harder versions mature ~11–13 | Hanoi 2–3 discs, river crossing ≤ 3 items; 4 discs = extension | [Hanoi development](https://link.springer.com/content/pdf/10.3758/BF03329485.pdf) |
| Working memory | Visual WM ≈ 3.5 items at 7–8, ≈ 4 at 9–10 (search summary) | ≤ 3 live constraints; keep notes on screen (✓/✗ marks, crossed-out candidates); tap-to-replay each clue | [Visual WM 3–8](https://link.springer.com/article/10.3758/s13414-016-1140-5), [Gathercole 2004](https://personalpages.manchester.ac.uk/staff/ben.ambridge/papers/Gathercole,%20Pickering,%20Ambridge%20&%20Waring%20(2004).pdf) |

**Teachable (explicit strategy) vs practice-only**

| Teachable in a lesson | Practice only |
|---|---|
| Sudoku last-cell / only-place / only-number; nonogram overlap; logic-grid elimination; Nim balance and mirror strategy; tic-tac-toe win → block → fork; "name the rule"; "mark dead ends" | Pattern intuition, rotation speed, working-memory span, fluency |

**Strategy instruction ("explain, then practise")**
- Primary-school strategy training d ≈ 0.61; maths 0.96 vs reading 0.44 ([Dignath & Büttner 2008](https://www.semanticscholar.org/paper/How-can-primary-school-students-learn-learning-most-Dignath-Buettner/cb3a02cdfadcff2880149fd15dd16e9066d55e4b)); stronger when the benefit is stated and feedback given.
- Novices gain from worked examples, not discovery alone ([Kirschner et al. 2006](https://eric.ed.gov/?id=EJ736299)) → Story → Demo → guided tries fits.
- Children who explain a new strategy generalise it more widely; tic-tac-toe rules are acquired win → block → fork → block-fork ([Crowley & Siegler 1993](https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog1704_3)) → ask "why did that work?" as a tap-choice; order bot levels the same way.
- Ostad (secondary summary): children with maths difficulty keep rigid counting strategies → prompt for the efficient one.
- Primary logic programme (Knight or Knave): small school trials, gains reported; author-evaluated, weak ([JRSMTE](https://jrsmte.com/article/knight-or-knave-description-and-evaluation-of-a-programme-for-the-introduction-of-logic-at-primary-16429)).
- Spaced review: spacing d ≈ 0.7 ([Cepeda 2006](https://www.yorku.ca/ncepeda/publications/CPVWR2006.html) via Hattie); spaced retrieval g = 0.74 ([Donoghue & Hattie 2021](https://www.frontiersin.org/articles/581216)); general, not child-specific.

**Transfer: be honest**
- Chess, music, WM-training meta-analyses: effect sizes shrink as design quality rises (active controls, randomisation); far transfer rarely occurs ([Sala & Gobet 2017](https://journals.sagepub.com/doi/10.1177/0963721417712760)). Brain training: gains on trained tasks, little broad transfer ([Simons et al. 2016](https://pubmed.ncbi.nlm.nih.gov/27697851/)).
- Spatial training transfers to untrained spatial tasks and lasts; maths transfer is mixed ([Cheng & Mix 2014](https://www.researchgate.net/publication/261094006_Spatial_Training_Improves_Children's_Mathematics_Ability): missing-term sums only).
- Claim only: strategies, near transfer (Bebras / Kangaroo-style tasks), persistence. No "raises IQ" copy.

**Reference sets for task design**

| Set | Use |
|---|---|
| [Bebras](https://www.mdpi.com/2227-7390/10/17/3194) (KiloBebras ≈ 8–10, [IT](https://it.wikipedia.org/wiki/Bebras_dell'informatica)): 12 tasks (4 easy / 4 medium / 4 hard), 45 min, ≈ 3 min each, cartoon context; categories: algorithmic thinking, patterns, logic puzzles | Task shapes, 3-tier difficulty |
| [Math Kangaroo / Kangourou](https://www.kangourou.it/images/regolamenti/2025/RegolamentoIndividuale2025.pdf): Pre-Écolier (cl. 2–3), Écolier (cl. 4–5), 24 questions at 3/4/5 points; magic squares, geometry, logic ([format](https://gonit.app/math-kangaroo-levels/)) | Easy/medium/hard calibration, content ideas |
| [SmartGames](https://www.smartgames.eu/uk/blog/play-it-single-here-are-our-top-5-best-single-player-games-kids-and-adults): single player, no winner/loser, 4–5 levels (Starter → Master), booklets with solutions | Level ladders, own-pace feel, unique solutions |
| [Mensa for Kids](https://chicago.us.mensa.org/kids/games.php): number / word / logic / visual puzzles | Puzzle-type ideas only; no pedagogy evidence |

## 2. Proposed curriculum: 7 worlds, 35 lessons

Kind codes → §3. Boss = optional mini-game. Ext = extension path 10–11. Unlock: W1 → W2 → W3 → W4 core; W5–W7 independent paths after W2.

**W1 Pattern Pond**

| id | Title | Child learns | Kinds | Boss |
|---|---|---|---|---|
| pat.1 | Repeat | Find the unit (AB, AAB, ABC); continue colours/shapes | next | Pattern Train |
| pat.2 | Number steps | ±1…5, skip-count 2/5/10 | next | Stepping Stones |
| pat.3 | Growing | Figures that grow by 1–2 each step; predict count | next, squares | Brick Tower |
| pat.4 | Far ahead | "10th item" by counting units; two features at once | next | Train Inspector |

Ext: ×2, alternating +a/+b, triangular numbers.

**W2 Sort Shore**

| id | Title | Child learns | Kinds | Boss |
|---|---|---|---|---|
| cls.1 | Odd one out | One differing attribute (colour, shape, size, count) | odd | Odd Pack belt |
| cls.2 | Find the rule | Name the shared attribute; 2–3 attributes, one answer | odd, sort | Odd Pack (rule switches) |
| cls.3 | Two boxes | Carroll 2×2: two attributes at once | sort | Sorting Sprint |
| cls.4 | Circles | Venn: both / only one / neither | sort | Venn Party |
| cls.5 | Line up | Seriation by size/amount; insert item; A>B, B>C ⇒ A>C | order | Queue Master |

Ext: 3-circle Venn, "all/some/none", two-criteria ordering, A:B::C:? analogies (familiar relations).

**W3 Mirror Meadow**

| id | Title | Child learns | Kinds | Boss |
|---|---|---|---|---|
| spa.1 | Mirror line | Complete symmetric picture, vertical/horizontal line | squares | Mirror Painter |
| spa.2 | Turn it | 2D turn 90/180°; turn ≠ mirror | turn | Turn Quick |
| spa.3 | Fold it | One fold + holes → unfolded pattern | squares, turn | Snip Snip |
| spa.4 | Count cubes | Stacks on 3×3 base: count hidden cubes by layers | grid, turn | Cube Builder |
| spa.5 | Fit pieces | Which pieces fill the hole (tangram-lite) | moves | Pack the Box |

Ext: 3D rotation, cube nets, side views, two folds.

**W4 Maze Mountain**

| id | Title | Child learns | Kinds | Boss |
|---|---|---|---|---|
| maz.1 | Find the way | Trace a path; mark dead ends | squares | Maze Runner (fog) |
| maz.2 | Shortest way | Two routes; count steps | squares | Race the Fox |
| maz.3 | Keys & doors | Order subgoals (key before door) | moves | Key Quest |
| maz.4 | Give directions | Arrow sequence reaches goal | order | Robot Courier (fewest arrows) |

Ext: repeat-loops, one-way tiles, bridges, conditional tiles.

**W5 Grid Puzzles**

| id | Title | Child learns | Kinds | Boss |
|---|---|---|---|---|
| grd.1 | Last empty cell | 4×4: one of each per row/column/box; fill the last gap | grid | Sudoku Sprint |
| grd.2 | Only place | Where can the 3 go in this box? (hidden single) | grid | Sudoku Sprint |
| grd.3 | Only number | Cross out via row/column/box; one number left (naked single) | grid | Sudoku Sprint |
| grd.4 | Six by six | 2×3 boxes, all three strategies | grid | Sudoku Sprint |
| grd.5 | Picture cross 1 | 5×5 clue = run; full/empty lines; big-run overlap | grid | Pixel Reveal |
| grd.6 | Picture cross 2 | Cross out, combine rows and columns | grid | Pixel Reveal |

Ext: sudoku pairs/pointing, easy 9×9, nonogram 10×10.

**W6 Clue Cove**

| id | Title | Child learns | Kinds | Boss |
|---|---|---|---|---|
| ded.1 | True or false | Check a statement against a picture (all / none / left of) | tf | Fact Checker |
| ded.2 | Guess who | Eliminate by yes/no clues; ask the halving question | sort (eliminate) | Guess Who vs bot |
| ded.3 | If … then | Find the picture that breaks the rule | tf, odd | Rule Breaker |
| ded.4 | Logic grid 3×3 | 3 animals × 3 pets, direct clues, ✓/✗ | lgrid | Pet Parade |
| ded.5 | "Not" clues | Elimination chains, "only one left" | lgrid | Pet Parade |
| ded.6 | Owls & foxes | Truth-teller / liar, one speaker, one statement | tf | Who Is Lying? |

Ext: 3 people × 4 attributes, two speakers, modus tollens, "either/or" clues.

**W7 Plan Ahead**

| id | Title | Child learns | Kinds | Boss |
|---|---|---|---|---|
| pln.1 | Tower of Hanoi | 2 → 3 discs; fewest moves 3 / 7 | moves | Crate Mover |
| pln.2 | River crossing | Fox-hen-corn; constraints on the bank left behind | moves | Ferry Master |
| pln.3 | Slide blocks | Rush Hour style 4×4: free the red car | moves | Traffic Jam |
| pln.4 | Nim | Take 1–3 from N; leave a multiple of 4; equal piles = mirror | vs bot | Nim vs Bear |
| pln.5 | Three in a row | Win → block → fork; misère variant | vs bot | Tic-Tac-Toe ladder |

Ext: Hanoi 4 discs (15), Missionaries (11 crossings), multi-pile Nim, Dots & Boxes chain rule.

Open: path vs linear unlock; "Give directions" may belong to a future coding subject.

## 3. Exercise-type catalogue

Stars: 3 = no hint, no error; 2 = 1 error or hint 1; 1 = done with hint ≥ 2 or ≥ 2 errors. Undo free. Hints: H1 highlight region + voice nudge; H2 name the strategy / remove wrong options; H3 show the next step, child performs it. Fast kinds 20–40 s (8–10 per lesson); grid/move kinds 2–4 min (5 per lesson).

| Kind | Interaction | Scoring | Machine check | Hints H1 / H2 / H3 |
|---|---|---|---|---|
| `next` choose next | Tap 1 of 3–4 options for the gap/next item | Errors | Rule-family enumerator: every rule that fits the shown terms predicts the same answer (e.g. 1,2,4 is ambiguous: 7 vs 8) | Frame the repeating unit / differences · "look at what changes" · animate the rule one step |
| `odd` odd one out | Tap 1 of 4–6 items | Errors | Per attribute, only one item is unique; all attributes pointing at an odd item name the same one | Light the compared attribute · hide attribute-equal items · ghost-mark the odd item |
| `sort` | Drag items to 2–4 zones (Carroll / Venn / eliminate) | Errors = wrong drops | Each item satisfies exactly one zone predicate; zone count fixed | Mark zone rules by icon · remove already-sorted items · auto-place one item |
| `order` | Drag to slots (size, count, arrows) | Errors = misplaced | Strict total order (no ties); arrow paths replay on grid | Light first/last slot · compare pair · place one |
| `grid` | Tap cell, tap number (or ■/✕ for nonogram); pencil marks | Errors = contradictions; stars drop on wrong placement | Backtracking solver counts solutions (exactly 1); human-like solver gives technique per step; check technique ≤ lesson level | Highlight the unit where progress exists · name the technique + candidates · fill the cell |
| `squares` | Tap squares on the existing board (path, mirror, fold, gap) | Exact set; first wrong tap = error | Derive the answer set; uniqueness by construction (maze tree, symmetric reflection) | Show axis / start / dead ends · mark wrong region · reveal one square |
| `turn` | Tap 1 of 3–4 turned / mirrored pictures | Errors | Exactly one option equals target under the transform; mirror distractor never equals any rotation (reject symmetric shapes) | Animate turning the target · show mirror flip vs turn · overlay the right option |
| `lgrid` | Tap cells ✓/✗ in a people × attribute grid; ✓ auto-crosses row/column | Errors = wrong mark | CSP enumeration (≤ 36 cases for 3×3 grid): exactly 1 solution; solver gives step list; clue count ≤ 3 live | Light the clue to use · say what it rules out · set one cell |
| `moves` | Tap/drag pieces (Hanoi, river, slide, keys); free undo | 3★ = optimal moves (BFS), 2★ ≤ optimal + 2, 1★ done | BFS over the state graph gives optimum and next-best move from any state | "What blocks the goal?" · show the sub-goal · animate the optimal next move |
| `tf` true/false | Tap ✓ / ✗ on a statement + picture; or tap the rule-breaker | Errors | Statement evaluated against a scene model; truth is computed, not authored | Light mentioned objects · read the statement in parts · show the checked object |

## 4. Mini-games / bosses (one skill each)

| Boss | Skill | Mechanic |
|---|---|---|
| Pattern Train | Pattern extension | Cars roll by; tap the car that comes next; 5-round series |
| Odd Pack belt | Flexible classification | Items on a belt dragged to bins; rule changes each round |
| Mirror Painter | Symmetry | Mirror the pattern with the fewest taps |
| Cube Builder | Spatial structure | Build the stack from the top-view numbers |
| Race the Fox | Shortest path | Beat the Fox's step count |
| Sudoku Sprint | Strategy chain | Chained "only place" steps, no timer |
| Pixel Reveal | Line-solving | Solved nonogram reveals an animal picture |
| Guess Who vs bot | Halving questions | Find the bot's secret animal; optimal = ⌈log₂ N⌉ |
| Nim vs bot | Balance / mirror strategy | Take 1–3 from N (leave multiples of 4); then two equal piles (copy the opponent's move) |
| Tic-tac-toe ladder | Win → block → fork | Variants: misère, 3 pieces each |

Why 2-player games fit: perfect information, small state space → exact minimax; bot level = share of optimal moves (random → win/block → +fork → perfect), the same ladder as the chess Mouse → Bear bots; strategies are speakable (Nim: [Hamkins](https://jdh.hamkins.org/win-at-nim-the-secret-mathematical-strategy/) reports first-graders mastering piles ≤ 3; [NRICH](https://nrich.maths.org/articles/learning-mathematics-through-games-series-4-strategy-games)); reuses `versus` mode and local friend play. Dots & Boxes (3×3 dots, avoid the third side; chain rule = 10–11, [source](https://www.gamesforyoungminds.com/blog/2018/12/23/dots-and-boxes)). Rule: the skill is the mechanic, not a quiz after play ([Habgood & Ainsworth](https://shura.shu.ac.uk/3556/1/Habgood_Ainsworth_final.pdf)).

## 5. Content generation

| Content | Generate | Guarantee | Difficulty rating | Authored |
|---|---|---|---|---|
| Sudoku 4×4 (288 grids) / 6×6 | Random full grid, remove clues while the solution count stays 1 ([method](https://dlbeer.co.nz/articles/sudoku.html)) | Backtracking counts ≤ 2 | Hardest technique of a human-like solver: last cell (SE 1.0) → hidden single (1.2–1.5) → naked single (2.3) ([SE scale](https://www.suuudokuuu.com/guides/sudoku-difficulty-rating), [overview](https://www.researchgate.net/publication/261217550_Difficulty_Rating_of_Sudoku_Puzzles_An_Overview_and_Evaluation)); lesson target step must occur ≥ once | Strategy explanations (templated per technique), voice lines |
| Nonogram 5×5 | Random / animal-shaped picture, clues | Solver finds 1 solution and it is line-solvable (no guessing) | Line-solver passes; small n×n difficulty clusters near n ([Batenburg & Kosters](https://liacs.leidenuniv.nl/~kosterswa/constru.pdf)) | Reward pictures |
| Logic grid 3×3 | Random solution; add clues from an inventory (direct, "not", "left of") until unique, prune redundant ([generator](https://github.com/tuchandra/zebra)) | Enumerate 36 cases | Clue count, clue types, solver chain length ([step-wise explainer](https://arxiv.org/pdf/2006.06343)) | Themes, clue wording |
| Mazes | Spanning tree = unique path; add loops for shortest-path tasks | BFS: unique shortest | Path length, dead ends, turns | Art |
| Move puzzles (Hanoi 2^n−1, river, slide) | State graph; sliding-puzzle parity; Rush Hour ([levels by optimal length](https://en.wikipedia.org/wiki/Rush_Hour_(puzzle))) | BFS optimum | Optimal length | Cast, story |
| Patterns, odd one out, sort | Rule + attribute-table generator | Ambiguity checks in §3 | Rule family level, attribute count | Item art, semantic categories ("flies") |
| Mirror / turn / fold / cubes | Grid transforms, height maps | Distractor ≠ target under any allowed transform | Grid size, steps | 3D art (isometric render by code) |
| True/false, if–then, knights & knaves | Scene model + templates | Evaluate truth; enumerate 2ⁿ assignments for uniqueness | Statement forms, speakers | Wording + narration |
| Stories, demos, bosses | – | – | – | All; calibrate ratings vs child error/hint rates |

## 6. Pitfalls and comparable apps

| Pitfall | Evidence | Mitigation |
|---|---|---|
| Fiddly input feels like trial and error, not reasoning | Brain It On reviewers: [AppUnwrapper](https://www.appunwrapper.com/2015/07/17/brain-it-on-review-draw-your-way-out-of-this-conundrum/), [MiniReview](https://minireview.io/puzzle/brain-it-on-physics-puzzles) | Discrete snap-to-grid input, solver-verified |
| No instruction → frustration | [Thinkrolls Space](https://www.commonsensemedia.org/app-reviews/thinkrolls-space): no help, trial and error, some kids frustrated; unlimited tries, no penalties | Keep free undo; add Story/Demo/guided tries (novices need guidance) |
| Difficulty ramps too fast | [Lightbot](https://www.commonsensemedia.org/app-reviews/lightbot-programming-puzzles): needs more simple puzzles first | One new element per exercise; 5–10 exercises per lesson |
| Hints not understood / hint spam | App-store reviews (anecdotal). All 4 hint designs lowered performance, 50k players ([Refraction](https://dl.acm.org/doi/10.1145/2556325.2566248)); [gaming the system](https://www.cs.cmu.edu/afs/cs/Web/People/listen2/pdfs/Baker175.pdf) | H2 teaches the strategy before H3 gives the answer; ≈ 2 s delay between levels; forced hint after 3 errors on a step |
| Early levels tedious; ads, subscriptions | App reviews (anecdotal); [Thinkrolls Play & Code](https://www.commonsensemedia.org/app-reviews/thinkrolls-play-code) subscription | First 3 exercises at 3★ → fast-track; offline, no ads |
| Trial-and-error passes | Zoombinis: [CT detectors from logs](https://www.terc.edu/publications/assessing-implicit-computational-thinking-in-zoombinis-puzzle-gameplay/) | 3★ needs no error; log systematic vs random |
| Quiz glued to game | Chocolate-covered broccoli | Skill = mechanic |
| Solver rating ≠ child difficulty | Rating counts techniques only | Child playtests, recalibrate; ambiguity review per CLAUDE.md content rule |
| Mirror vs turn confusion | Hawes 2015 | Separate lessons |
| Overload | WM ≈ 3–4 items | ≤ 3 live clues, notes, replay per clue |
| Over-claiming | Sala & Gobet, Simons | "Practises strategies", not "makes smarter" |
