# Adding a subject

A subject made only of YAML + art: one command, then YAML. Starter = `packages/subject-template` (built, typechecked and tested by CI; not registered in the app). Related: [multi-subject.md](multi-subject.md) D15, [architecture.md](architecture.md) §3, [voice.md](voice.md).

## 1. Quick path

| # | Step | Command / action |
|---|---|---|
| 1 | Scaffold | `pnpm new-subject music-notes "Music Notes"` (id `[a-z][a-z0-9-]*`; name 1–24 letters, digits, spaces, hyphens) |
| 2 | Install | `pnpm install` (links the package, updates `pnpm-lock.yaml`), then `pnpm format` |
| 3 | Content | Edit `packages/subject-music-notes/content/` (§3); `pnpm --filter @learn/subject-music-notes build` after each edit (lists every issue) |
| 4 | Run | `pnpm dev`: a "Music Notes" tile appears on the hub |
| 5 | Test | `pnpm --filter @learn/subject-music-notes test` (first run writes `src/__snapshots__/`: commit them) |
| 6 | Voice | add the subject to the 3 lists (§5), `pnpm voice:generate`, `pnpm voice:check` |
| 7 | e2e smoke | `apps/kids-learning/e2e/music-notes/` (§5); `pnpm build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm test:e2e` |

The scaffold copies the starter without `node_modules`, `dist`, `__snapshots__`; replaces `template` (path / id; camelCase for identifiers: `templateCore` → `musicNotesCore`), `Template` (display name), `TEMPLATE` (`MUSIC_NOTES`); registers the subject at markers in `apps/kids-learning`:

| File | Marker | Gains |
|---|---|---|
| `package.json` | after the last `@learn/subject-*` | `"@learn/subject-<id>": "workspace:*"` |
| `src/main.tsx` | `// new-subject:import`, `// new-subject:entry` | import + entry in `subjects` |
| `src/index.css` | `/* new-subject:source */` | `@source` line |

Same id twice = error (nothing written). Texts: replace the sample lessons, `app.title`, the icon (`src/web/art/subject-icon.svg`), tile `colors` (`src/entry.ts`), rank glyphs (`src/web/<id>-pack.ts`).

## 2. What a subject provides

| Part | Scaffolded file | Card kit covers |
|---|---|---|
| Manifest | `src/entry.ts` (`SubjectEntry`: id, settings slot, names, icon, colours, lazy `load()`; imports no pack) | settings slot; you give name, icon, colours |
| Core | `src/core.ts` `createCardCore({ id, characters })` | kinds `choice`, `true-false`, `number-entry`, `order`; notes; `series` boss from the runtime |
| Content | `src/content.ts` `createCardContent({ characters })`, `content/`, `scripts/build-content.ts` | schemas, compile, verify, prompt stimulus, `series` mode |
| Web | `src/web/<id>-pack.ts` `createCardWeb({ core, content, art, rankGlyphs })`, `<id>-loaded.ts` (pack + `dist/locales/en.json`) | kind UIs, card prompt, surfaces; content source `createBundledContentSource` |
| App | `apps/kids-learning` | hub tile, store `kids-<id>:`, backup, parent area, rewards |

You write YAML, texts, art and glyphs; no TypeScript beyond the identifiers.

## 3. Content YAML

Layout: `tracks.yaml` (worlds, ranks), `badges.yaml`, `lessons/<world>/<lesson>.yaml`, `minigames/<id>.yaml`, `locales/en/{common,characters,journey,lessons,rewards}.yaml`. Texts live in `locales/en/lessons.yaml` under the exercise `id` (or `text:` key). Ids are unique across the subject (lessons, exercises, variants, rounds, boss).

| Field | Meaning |
|---|---|
| `id`, `type`, `text?` | kebab id; kind; text key (default `id`) |
| `prompt?` | `{ emoji?, big?, image? }`, at least one; `big` ≤ 16 chars (`big: 3` reads as text); `image` = id in `art` |
| `easier?` | id of a lesson `variants` entry; scored exercises only; each variant is referenced once |
| item (option / order item) | `{ id, text?, emoji?, big?, image? }`, at least one of the four |

| `type` | Fields (defaults) | Verify rules |
|---|---|---|
| `choice` | `options` (≥ 2 items), `answer` (option id) | option ids unique; `answer` is an option |
| `true-false` | `answer: true \| false`; the statement = text + prompt | none |
| `number-entry` | `answer` 0–9999, `maxDigits` 1–4 (default `max(2, digits of answer)`) | answer fits `maxDigits` |
| `order` | `items` (≥ 2, display order), `answer` (every item id, right order) | ids unique; `answer` is a permutation; differs from display order |

```yaml
- { id: q1, type: choice, prompt: { emoji: 🍎🍎🍎 }, options: [{ id: a, big: 2 }, { id: b, big: 3 }], answer: b }
- { id: q2, type: true-false, prompt: { big: 2 + 2 = 5 }, answer: false }
- { id: q3, type: number-entry, prompt: { big: 7 + 5 }, answer: 12 }
- { id: q4, type: order, items: [{ id: b, big: B }, { id: a, big: A }], answer: [a, b] }
```

| File | Shape |
|---|---|
| Lesson | `id`, `order`, `concept`, `character`, `demo` (`{ text?, prompt? }`), `guided`, `exercises` (≥ 1), `variants?`, `boss?`; text keys `<id>.title`, `.story`, `.demo` |
| Boss (`mode: series`) | `id`, `concept`, `unlockAfter` (last lesson of the world naming it as `boss` in `tracks.yaml`), `errors3` ≤ `errors2`, `rounds` (any kinds) |
| Badge | `id`, `category`, `condition: { type, thresholds }`; texts `badges.<id>.name` / `.condition` |

## 4. Going further

| Need | Where | Example |
|---|---|---|
| Own exercise kind | core kind + `solution` + content kind + UI + e2e driver, registered in the subject's registries; type dispatch only via registries (`dispatchGuard`) | `subject-chess/src/kinds/`, `subject-coding/src/kinds/` |
| Own mini-game mode | mode def + content + UI | `subject-chess/src/modes/` |
| Routes, home tiles, store slice, parent panels, surfaces, `characterArt` | optional `SubjectWeb` fields | `subject-chess/src/web/chess-pack.ts` |
| Profile settings | own `SubjectSettingsSlot`; field names unique across subjects | chess `computerLevel` |
| Mix | `createCardCore({ notes })`, `characterColor`; start from `subject-coding` (card kit + own kinds) for a hand-built pack | `subject-coding/` |
| Items that differ only by numbers | `generate:` entries + a template (§6) | `platform-content/src/testing/card-fixture.ts` (`fixture-add`) |

Layers and boundary lint: [architecture.md](architecture.md) §3 (platform never imports a subject; `src/core`, `src/content` stay React-free).

## 5. Checklist before shipping

- [ ] Content review rule (CLAUDE.md): each question checked against its card, exactly one reading leads to the accepted answer, no distractor items; log it as a check in [validation.md](validation.md)
- [ ] Nothing else to register: the size check, `pnpm voice:check` and `pnpm voice:generate` read the subjects from `apps/kids-learning/package.json` (`scripts/app-subjects.ts`; the content export must be named `<camelId>Content`, as the scaffold does)
- [ ] `pnpm voice:generate`, then `pnpm voice:check` green (without audio the device voice speaks)
- [ ] `pnpm size`: entry ≤ 135 KB, subject chunk `<id>-loaded-*.js` ≤ 70 KB gzip
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm format:check`
- [ ] e2e smoke, `apps/kids-learning/e2e/<id>/kit.ts` + `smoke.spec.ts` (runs in the `chromium` and `tablet` projects; add `/[\\/]<id>[\\/]/` to the tablet `testIgnore` in `playwright.config.ts` to run once):

```ts
// kit.ts
import { createE2ETexts } from '@learn/platform-web/e2e/i18n.ts';
import { createPages } from '@learn/platform-web/e2e/pages.ts';
import en from '@learn/subject-<id>/dist/locales/en.json' with { type: 'json' };

export const { contentText } = createE2ETexts({ en });
export const { startLessonToFirstGuided } = createPages({
  appTitle: contentText('app.title'), texts: { contentText }, subjectId: '<id>',
});
// smoke.spec.ts
test('opens from the hub and starts its first lesson', async ({ page }) => {
  await startLessonToFirstGuided(page);
  await expect(page.getByText(contentText('lessons:<first guided id>'))).toBeVisible();
});
```

- [ ] Docs: `docs/subjects/<id>/` plan + curriculum; row in `architecture.md` §3 package table; log row in `validation.md`

## 6. Generated exercises

Items that differ only by numbers are drawn at build time from a seeded template and stored with the content: no runtime change, audio is generated per concrete sentence. Decisions G1–G4: [subjects/math/plan.md](subjects/math/plan.md) §4.

**YAML**: a `generate:` entry stands for `count` items in a lesson's `guided` / `exercises` / `variants` or a `series` `rounds`.

```yaml
exercises:
  - id: sums                 # the stem
    easier: sums-easy        # optional: copied onto every item
    generate: { template: add, count: 3, seed: 7, params: { max: 10 } }
```

| Field | Rule |
|---|---|
| `id` | stem, kebab; items are `<stem>-1 … <stem>-<count>` (claimed like authored ids, unique subject-wide; the stem itself is not an id) |
| `template` | id in the subject's `templates`; unknown = issue `unknown template "x"` |
| `count` | integer 1–20 |
| `seed` | integer ≥ 0, stored in the YAML |
| `params?` | parsed by the template's zod schema; issues at `generate.params.<path>` |
| `easier?` | copied onto each item (the lesson's variant rules apply to every item) |

**Ids**: independent of the seed (`<stem>-<n>`), so stored stars stay on the same id. Never reseed or recount a released lesson: its ids would show other items. Bump the stem instead (new stem = new ids).

**Template** (registered with `createCardContent({ characters, templates: { add } })`, or `SubjectContent.templates`):

```ts
const add: ExerciseTemplate<{ max: number }, AddItem> = {
  params: z.object({ max: z.number().int().min(2).max(20) }).strict(),
  generate({ max }, ctx) {          // one candidate, written as the author would write the YAML
    const a = randomInt(ctx.random, 1, max - 1);
    const b = randomInt(ctx.random, 1, max - a);
    return { id: ctx.id, type: 'number-entry', text: ctx.text('text', 'templates.add', { a, b }),
             prompt: { big: `${a} + ${b}` }, answer: a + b };
  },
  check(item, params, at) { /* re-parse item.prompt.big, compare with item.answer, at.issues.push(...) */ },
};
```

| Rule | Detail |
|---|---|
| Seeded | one `seededRandom(seed)` stream per entry (`ctx.random`; `randomInt`, `pick`, `shuffle` from `@learn/platform-core/domain/random`), draws in order: same seed = same items on every machine |
| Distinct | a draw equal to an earlier item of the entry (id ignored, generated texts compared as English sentences) is redrawn, at most 100 draws per item, then issue `could not generate <count> distinct items` |
| Check = independent solver | `check` re-derives the answer from what the kid sees (prompt, options), not from the variables `generate` used; pushes an issue on `at` when the answer is not unique or wrong, or options repeat. Runs once per accepted item |
| Then | each item is parsed by the subject's exercise schema (issues at `<file>: <field>[<entry index>] (generated <id>)`), compiled and verified like an authored one |
| Id | the item must use `ctx.id` |

**Texts**: `ctx.text(name, templateKey, vars)` takes the `lessons:` text `templateKey`, fills `{{var}}` in every language of the content (numbers per language: `1234`, `10,000` in English; a numeric `count` picks the plural form as everywhere), stores it as `lessons:gen.<item id>.<name>` and returns `gen.<item id>.<name>` for a YAML text field (`text:`, an option or item `text:`).

| Rule | Detail |
|---|---|
| Template texts | author them as `templates.<id>…` in `locales/<lang>/lessons.yaml`, in every language; a language without the key = issue naming the language and key |
| `gen` is reserved | an authored `gen` key in `lessons` = issue `lessons: "gen" is reserved for generated texts` |
| Where they land | merged into the locales before the text-key checks: `dist/locales/<lang>.json`, the voice inventory (`voice-texts.json`) and `checkTextKey` see them like authored texts |
| `name` | lowercase kebab-case, once per draw; every `{{var}}` of the text needs a value |

**Reasons** (decision G5): a wrong card answer that matches a known misconception speaks its reason instead of the default wrong note. Authored or generated alike (a template writes `reason: bugs.<id>` / `reasons: [{ value, text }]` or a `ctx.text(...)` ref).

| Kind | YAML | Spoken when | Verify |
|---|---|---|---|
| `choice` | option `reason: <text ref>` | that option is picked | not on the `answer` option |
| `true-false` | `reason: <text ref>` | the wrong button is pressed | text key resolves |
| `number-entry` | `reasons: [{ value, text }]` | exactly `value` is typed | values distinct, not the `answer`, fit `maxDigits`; text keys resolve |

Any other wrong answer keeps the default note; scoring, errors and hints do not change. The reason is spoken alone, plus the easier-offer sentence on an exercise that has an `easier` variant.

**Voice** (decision G6): `createCardContent` puts the card notes of the kinds the content uses into the voice inventory (`cardVoiceTemplates(notes)`, computed through core's `exerciseNote`): the wrong notes (plain and with the easier offer), every reason, every hint by level, the 1–3 star praise. A subject with its own `voiceTemplates` composes it: `cardVoiceTemplates(core.notes)(add, r, all)` (coding does). Run `pnpm voice:generate` after adding reasons.

Reference: `packages/platform-content/src/testing/card-fixture.ts` (`fixture-add`, used by one lesson entry and one series round of the card fixture), tests `generate/expand.test.ts`.
