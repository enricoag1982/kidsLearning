# Kids Learning — project guide

Offline multi-subject learning app for children aged 8–9 (chess, math; coding and logic planned). Forked 2026-10-04 from `enricoag1982/learningChess` (Chess for Kids `v4.1.0`, full history kept). v1.0 plan: `docs/multi-subject.md`.

## Working style (user preferences)

- Act as an experienced PM / tech lead. Be very compact: facts only, shortest wording that keeps full understanding, no editorial sentences.
- Tables and short bullets over prose.
- Record every decision in the relevant doc under `docs/`, commit and push.
- **Delegate coding and testing to simpler models** via the Agent tool when possible:
  - `model: "sonnet"`: implementation tasks with a clear spec (files, interfaces, tests to write).
  - `model: "haiku"`: running lint / typecheck / tests, mechanical edits, dependency checks.
  - Main agent: plans, writes precise task specs, reviews diffs, decides, commits.
  - Agent specs: ≤ 3–4 commits and one concern per run; the lead decides interfaces and types in the spec; fast checks per commit, full e2e once at the end; prove every new lint / guard rule with a failing fixture (`docs/retrospective.md` §9).
- Git workflow: see `CONTRIBUTING.md`. `master` only via PR; required check `quality`; 0 approvals; squash merge. Claude opens the PR (template), waits for `quality` green, then squash-merges. Branches from `master` (one per milestone / iteration); commit and push after each step; ask the user before merging a milestone PR unless merging was delegated. Each merged iteration: log row in `docs/validation.md` (checks run, manual checks) + squash title `M<N>.<i>: …` → CI creates annotated tag `m<N>.<i>` (session cannot push tags: HTTP 403).

## Docs (read the relevant one before working on an area)

| Doc | Content |
|---|---|
| `docs/multi-subject.md` | v1.0 plan: one app, many subjects; decisions D1–D18, data scope, M11 iterations |
| `docs/adding-a-subject.md` | How to add a subject: `pnpm new-subject`, card kinds YAML, going further, ship checklist |
| `docs/new-subjects.md` | Subject ideas and ranking (coding, math, logic, games, …), product shape |
| `docs/subjects/coding/plan.md` | Coding v1.1 plan: principles, curriculum W1–W3, kinds, platform needs, M12 iterations (`research.md` beside it) |
| `docs/subjects/coding/curriculum.md` | Coding as shipped: lessons, exercises, build rules, content review log |
| `docs/subjects/math/plan.md` | Math v1.2 plan: principles, W1–W3 (place value, mental math, times tables), kinds, generated items, M13 iterations |
| `docs/subjects/logic/plan.md` | Logic v1.3 plan: principles, W1–W3 (patterns, sorting, grid puzzles), kinds, generators, M14 iterations |
| `docs/subjects/chess/teaching-process.md` | Chess pedagogy: principles, learning loop, phases, mini-games |
| `docs/subjects/chess/curriculum.md` | Chess lesson list: Basics (worlds 1–5) + 3 paths, mini-game catalogue |
| `docs/app-structure.md` | Modes, profiles, navigation, flows, progression, theme, parent code, time controls, MVP |
| `docs/domain-model.md` | Entities, exercise types, rules (mastery, review, unlocks), use cases, ports, content files |
| `docs/architecture.md` | Stack, layers, repo layout, ports, content format, tests, decisions |
| `docs/subjects/chess/computer-opponent.md` | Bot levels (Mouse → Bear), move choice, aids, tests |
| `docs/rewards.md` | Reward rules, badge catalogue, badge engine |
| `docs/non-functional.md` | Offline, accessibility, privacy, performance, reliability |
| `docs/screens.md` | UI rules, screen list; sketches: https://claude.ai/artifact/HohYgZ3J9mqBrsamJnin5S |
| `docs/roadmap.md` | MVP scope, epics, milestones M0–M14, playtests, metrics, decisions |
| `docs/validation.md` | Check IDs, per-tag validation log |
| `docs/release.md` | Release checklist, tagging, rollback |
| `docs/retrospective.md` | Chess M0–M5 retrospective: outcome, time spent, went well / wrong, learnings |
| `docs/refactor-v4.md` | v4 plan: learning-platform refactor (platform packages + chess subject pack), phases, targets |

## Key decisions

- Offline app: no server; all data on device. v2 = offline time controls + device sharing by file with merge (owner 2026-09-25). Online (login, remote play, automatic sync) parked, hooks only.
- TypeScript + React + Vite PWA; Capacitor later for Android / iPad. GitHub Pages hosts the static app.
- Packages (`packages/*`, `apps/*`): `@learn/platform-core` (pure TS: domain, use cases, ports); `@learn/platform-content` (YAML → Zod → JSON build); `@learn/platform-web` (React shell, adapters); `@learn/subject-chess` (chess pack: core, kinds, modes, content, web); `@learn/subject-math` (math demo pack); `@learn/subject-coding` (coding pack, from M12); app `@learn/kids-learning` (deployed, thin shell) hosts every subject (`docs/multi-subject.md` D1; replaced `chess-kids` + `math-demo` in `m11.6`). Dependencies point only to earlier entries; platform never imports a subject (ESLint boundaries, `docs/architecture.md` §3).
- Animal theme (avatars, Journey, bots; pieces use real names, no animal badges — owner 2026-09-30); English first (i18n); narration = Web Speech API (device voices) up to v1.1, pre-generated audio (Kokoro) from M6.
- Parent code (UI term; not a real password) kept in a simple plain-text file; the code screen reminds where the file is (web: copy in Downloads, again via "Download parent code file" in the grown-ups area; store apps: editable file in app Documents). Daily time limit in v1.

## Status and next step

- Chess history (repo `learningChess`): M0–M10 done, releases up to `v4.1.0` (tags live in `learningChess` only); v4 refactor closed (`docs/refactor-v4.md` §6). Details: `docs/roadmap.md`, `docs/validation.md`.
- Owner plan (2026-10-04): v1.0 = multi-subject app serving chess + math demo (M11, `docs/multi-subject.md` §4); then v1.1 Coding (M12), v1.2 Math (M13), v1.3 Logic (M14), each researched and planned in `docs/subjects/<id>/` before building; target age 8–9, extendable.
- Done: M11 = v1.0 (`m11.1`–`m11.9`, 2026-10-04): one app `apps/kids-learning` (chess + math demo), per-subject storage / backup v6, subjects hub, parent area per subject, card kit, template + `pnpm new-subject`. `v1.0.0` tag after the owner's `docs/release.md` §1 checks.
- Done: M12 = v1.1 Coding (`m12.1`–`m12.7`, 2026-10-04): platform grid board, `@learn/subject-coding` (tiles, simulator, BFS solver, kinds program / predict / find-bug, editor + run animation), W1–W3 (13 lessons, 3 world bosses, 127 exercises). `v1.1.0` tag after the owner's checks.
- Done: M13 = v1.2 Math (`m13.1`–`m13.15`, 2026-10-04): generated exercises (templates + seeds, build-time texts), misconception reasons, card voice, math on the card kit, kinds number-line / place-value / array, platform `duel` mode, W1–W3 (16 lessons, 3 world bosses incl. Race to 20 vs a bot). `v1.2.0` tag after the owner's checks.
- Done: M14 = v1.3 Logic (`m14.1`–`m14.14`, 2026-10-05): card shape tokens, platform `group` kind (row / Carroll / Venn, opt-in), `GridBoard` puzzle props, `@learn/subject-logic` (solvers, generator, `grid-fill` kind for sudoku and picture cross), W1–W3 (14 lessons, 3 world bosses: Pattern Train, Sorting Sprint, Sudoku Sprint), hub of four subjects. `v1.3.0` tag after the owner's checks.
- In progress: M15 = follow-ups F1–F14, F19 (`docs/roadmap.md` M15, `m15.1`–`m15.5`, release `v1.3.1`; owner request 2026-10-05).
- Next (when the owner asks): playtests of Logic; v1.4 ideas (Plan Ahead: Nim, tic-tac-toe with a draw-aware `duel`; `docs/subjects/logic/plan.md` §2); Store apps (M16), Chess paths (M17).
- Live: https://enricoag1982.github.io/kidsLearning/ (deploy on every push to `master`; Pages source = GitHub Actions since 2026-10-04).
- Local: `pnpm install` (also builds the content JSON) · `pnpm dev` · `pnpm test` (one package: `pnpm --filter @learn/<pkg> test`) · `pnpm test:slow` · `pnpm lint` · `pnpm typecheck` · `pnpm format:check` · `pnpm build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm test:e2e` (cloud sandbox browser path) · `pnpm size` · `pnpm compat` · `pnpm voice:check` (every subject's inventory vs the app's audio) · `pnpm voice:generate` (Kokoro; venv with `kokoro-onnx lameenc soundfile`) · `pnpm new-subject <id> "<Name>"` (`docs/adding-a-subject.md`).
- Dev playgrounds (dev builds only): `/#board`, `/#exercises`, `/#lesson=<id>&view=<story|demo|boss|exercise id>`.
- Content review rule: every select-squares / yes-no / choice / setup text is checked against its board so exactly one reading leads to the accepted answer (log it as check N). No distractor pieces: a piece the question is not about pulls the eye (playtest: "row closest to you" with a king in the middle was read as "squares closest to the king"); say "bottom row" / "top row", not "closest to you". Diagonals: every non-corner square sits on two; "tap the diagonal" only from a corner square, otherwise name which one ("from corner to corner", "the short one") (owner 2026-09-26).

Version notes (checked 2026-09-24):

| Package | Version | Note |
|---|---|---|
| typescript | 6.0.x | typescript-eslint 8.70 requires `<6.1`; do not use TS 7 |
| vite / @vitejs/plugin-react | 8.x / 6.x | |
| vitest | 5.x | |
| tailwindcss / @tailwindcss/vite | 4.x | |
| vite-plugin-pwa | 1.3.x | |
| chess.js | 1.4.x | BSD-2 |
| zod / yaml | 4.x / 2.x | |
| i18next / react-i18next | 26.x / 17.x | |
| zustand | 5.x | |
| @playwright/test | 1.63.x | Cloud sandbox: use `executablePath: /opt/pw-browsers/chromium` locally (preinstalled chromium-1194); CI installs its own browser |

GitHub Pages: free plan needs a public repo; Pages source = GitHub Actions (set 2026-09-24).
