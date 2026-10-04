# Multi-subject app (v1.0, milestone M11)

Owner request (2026-10-04): fork `learningChess` into `kidsLearning`; one app for several subjects; make most of the platform generic so a new subject is quick to add; generic screens (e.g. Journey) are acceptable. v1.0 serves chess + the math demo (proof of a second subject). Then v1.1 Coding, v1.2 Math, v1.3 Logic (`new-subjects.md` ranks 1–3), each researched and planned first. Sources: 3 code maps (UI, data, build) on `master` @ `731b8ed`.

## 1. Decisions

| # | Topic | Decision |
|---|---|---|
| D1 | Apps | One deployed app `apps/kids-learning` (renamed from `apps/chess-kids`) hosting every subject. `apps/math-demo` removed; math becomes a subject of the main app |
| D2 | Identity | Name "Kids Learning"; storage prefixes `kids:` (shared) and `kids-<subject>:` (per subject; siblings, not nested: `openLocalStore` treats any key under its prefix as its own); backup app id `kids-learning`; files `kids-learning-backup-…`, `kids-learning-parent-code`; app version `1.0.0` at release |
| D3 | Existing chess users | New URL = fresh storage. Chess progress moves by backup file: `app: 'chess-kids'` files (schema ≤ 5) import as the chess subject. Automatic import of `chess-kids:` localStorage (same origin) = follow-up F1 |
| D4 | Active subject | Exactly one active subject. Subject-bound screens read the active pack and subject-scoped deps, unchanged. Switching swaps pack, deps, i18n resources, reloads profile data, resets subject state |
| D5 | Data scope | §3 |
| D6 | Profile settings | Flat: platform fields + every registered subject's slot fields. Field names unique across subjects (asserted when the registry is built). Chess `computerLevel` stays as is (backup compatible) |
| D7 | Packs | `SubjectEntry = { manifest, load }`: static manifest (id, name, icon, colours, settings slot, legacy backup app ids), lazy `load()` → `SubjectWeb` + locales. A pack's store slice is installed on its first activation. Route names unique across subjects (asserted) |
| D8 | i18n | Platform bundle at start (picker, hub, parent area, first run). Activation replaces the resources with the subject bundle (platform + subject, merged at build as today). Keys a global screen reads (`app.title`, privacy intro, voice-check sentence, time-limit early body, …) move to the platform; subject names come from the manifest |
| D9 | Hub | New platform route `subjects` after profile select (skipped when only 1 subject). Home header: "Subjects" button. Last subject per profile in `AppSettings.lastSubjectByProfile` |
| D10 | Placement | Offered at the first entry into each subject (was: at profile creation); decision stored per subject |
| D11 | Parent area | Per child: subject chips; report, settings panel, unlock list per subject (pack loaded on demand). Shared: profiles, parent code, time limits, backup, sharing |
| D12 | Rewards | Streak and minutes shared; stars, rank, friends, badges, Den, Today, Practice per subject |
| D13 | Voice | One `audio/en/` folder; manifest = union of all subjects' inventories (keys are content hashes); voice tools iterate subjects |
| D14 | Docs | Platform docs in `docs/`; subject docs in `docs/subjects/<id>/` (chess: curriculum, teaching process, computer opponent). Platform docs keep chess as the worked example |
| D15 | Generic kit | Generic kinds in the platform (`choice`, `number-entry`, `yes-no`; grid / order / sort added when Coding / Math / Logic need them); default surface (card stimulus: text, emoji, image); `defineSubject()` defaults; scaffold `pnpm new-subject <id>` |
| D16 | Journey | Stays the world map; chess-only labels ("Paths after Basics") become subject text; habitat colours stay (animal theme) |
| D17 | Numbering | Milestones continue: M11 = v1.0, M12 Coding (v1.1), M13 Math (v1.2), M14 Logic (v1.3). Chess Store apps / Paths move after (roadmap) |
| D18 | Formats | Backup `schemaVersion` 6 (shared part + `subjects` per profile); storage `SCHEMA_VERSION` 6 per store. `chess-kids` localStorage fixtures no longer read (fresh storage); backup fixtures kept for legacy-import tests |

## 2. Target structure (end of M11)

```
packages/
  platform-core/     + domain/subjects.ts (SubjectManifest, registry checks), app/subject-deps.ts (scoped AppDeps)
  platform-content/  + generic kinds content (number-entry, yes-no), card stimulus
  platform-web/      + multi-pack host (mountApp({ subjects })), SubjectsScreen, generic kinds UI, default surface, defineSubject
  subject-chess/     unchanged behaviour; manifest + lazy pack
  subject-math/      demo subject; uses platform kinds where possible
  subject-template/  (or scripts/new-subject) scaffold source
apps/
  kids-learning/     shell: mountApp({ subjects: [chess, math], app: KIDS_APP_CONFIG })
docs/
  subjects/chess/    curriculum, teaching-process, computer-opponent
```

## 3. Data scope

| Data | Scope | Store |
|---|---|---|
| Profiles, parent code, device id, storage-persist flag, install banner, voice report | Shared | `kids:` |
| `AppSettings` (`lastProfileId`, `lastSubjectByProfile`, `profileSettings` (flat, D6), `suggestedLevels` until moved to chess) | Shared | `kids:` |
| Session logs (daily limit sums all subjects), streak | Shared | `kids:` |
| Lesson progress, attempts (cap per subject), mini-game progress, concept stats, game records, earned badges, assessment results, unlocks, placement decision | Per subject | `kids-<id>:` |

`AppDeps` keeps its shape: `createServices` builds shared repositories once and one scoped `AppDeps` per subject (content, subject runtime, subject repositories; `RewardsRepository` reads badges from the subject store, streak / session logs from the shared one). Cross-subject use cases (backup, merge, profile delete / reset, parent report) get `deps.subjectData` (per-subject repositories by id).

## 4. Iterations (M11; each = 1 PR, squash `M11.<i>: …`, tag `m11.<i>`)

| Tag | Scope | Exit check |
|---|---|---|
| `m11.1` | This plan; repo identity (README, CLAUDE.md, privacy issues URL → `kidsLearning`); docs restructure (D14) | Docs only + 1 URL; CI green |
| `m11.2` | Core: subject registry checks, scoped `AppDeps`, storage split (D2, §3), settings composition (D6), delete / reset over all subjects. Done: interim configs keep one store per app (`chess-kids:`, `math-demo:`) until `m11.6`; `deleteProfile` now also removes the shared streak / session logs (were orphaned) | Chess app unchanged on top (1 subject); unit + e2e green |
| `m11.3` | Backup v6 + per-subject merge + legacy `chess-kids` import (D3, D18); session-log schema keeps `deviceId` / `extraMinutes` / `hoursOverrideUntil` / `warnedAt` (zod strips them today). Done: `AppConfig.legacyBackupApps`, `AppDeps.subjectId`; a legacy file with the own app id imports into the only subject; subjects a file has but the app does not host are ignored; storage-compat expected outputs (`*.snap.json`) regenerated, recorded inputs unchanged | v1.0–v4 chess backup fixtures import as chess; v6 round-trip |
| `m11.4` | Web host: `mountApp({ subjects })`, lazy packs, active subject in store, i18n swap (D8), slice install, `subjects` hub + Home switch (D9). Done: `SubjectEntry` (`manifest` + `load`), `AppServices` (eager shared stores + subject data, `activate(id)` loads once) / `Services` (active subject), `activateSubject` / `selectSubject` / `goToSubjects`; light `entry.ts` + `app-config.ts` per subject (entry chunk free of chess.js); initial JS 186.2 → 128.8 KB (chess pack = own chunk, 57.7 KB). Two-subject flow covered by App-flow tests; e2e in `m11.6` | Dev app with chess + math switches subjects |
| `m11.5` | Per-subject flows: placement (D10), parent area (D11), Den / Today / Celebration per subject; global-screen keys to the platform (D8). Done: `AppConfig.title` (first run, privacy text `{{app}}`); spoken texts stay subject-worded (voice inventory unchanged); placement offered on entering a fresh subject (no progress, assessment or unlock; once per app session, not persisted); parent area: `SubjectScopeProvider` / `useSubjectScope` / `SubjectChips` / `SubjectTexts` (a non-active subject's own texts), overview one line per subject (loads every pack) | e2e: two subjects, one profile, separate progress (in `m11.6`) |
| `m11.6` | `apps/kids-learning` (D1, D2): rename, math joins, `apps/math-demo` removed; manifest, icons, title; e2e via hub; CI / deploy / size / voice paths (D13) | Pages deploys the new app; size budget per entry + per subject chunk |
| `m11.7` | Generic kit (D15, D16): platform `number-entry` + `yes-no`, card stimulus + default surface, `defineSubject`, `pnpm new-subject` + CI check, `docs/adding-a-subject.md` | A scaffolded subject builds, typechecks and passes its content tests in CI |
| `m11.8` | Release `v1.0.0`: README screenshots, validation rows, release checklist | Owner checks (`docs/release.md` §1) |

Rules: `docs/retrospective.md` §9 (≤ 3–4 commits per agent run, lead decides interfaces, fast checks per commit, full e2e once). Chess invariants every iteration: content snapshot equal, chess e2e green, backup fixtures import.

## 5. After v1.0

| Version | Milestone | Content |
|---|---|---|
| v1.1 | M12 Coding | Research → `docs/subjects/coding/` plan → iterations (grid robot, program / predict / debug kinds) |
| v1.2 | M13 Math | Full curriculum on the demo (number line, arrays, clock, coins; generated exercises) |
| v1.3 | M14 Logic | Patterns, sorting, grid puzzles (sudoku, nonogram), planning puzzles |

## 6. Risks

| Risk | Mitigation |
|---|---|
| Chess regressions while seams move | Content snapshot, backup fixtures, full chess e2e per iteration |
| Two subjects' ids alias in storage | Per-subject stores (§3); registry asserts unique settings fields and route names |
| Initial bundle grows per subject | Lazy packs (D7); `pnpm size` budgets the entry and each subject chunk |
| Same origin as `learningChess` | Distinct prefixes (`kids:`, `kids-<id>:` vs `chess-kids:`); service worker scope is per path |

## 7. Owner actions

| Action | Where |
|---|---|
| Pages source = GitHub Actions (deploy needs it) | Settings → Pages |
| Ruleset `master-quality` (required check `quality`, squash only) | Settings → Rules (`CONTRIBUTING.md`) |
| v1.0.0 tag after release checks | Actions → Tag (`docs/release.md` §2) |
