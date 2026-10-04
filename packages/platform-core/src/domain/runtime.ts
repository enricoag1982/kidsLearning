// `createSubjectRuntime`: builds a subject's kind + mode registries for platform code, adding the
// platform `series` mode over the subject's own kinds.
import { createSeriesMode } from './exercise/modes/series/mode.ts';
import type { AnyKind, AnyMode, SubjectCore, SubjectSettingsSlot } from './subject.ts';

/** A subject's kind + mode registries for platform code to dispatch through; `rewards`/`gameRecordOf` pass through unchanged. */
export interface SubjectRuntime<Ctx = unknown, F = unknown> {
  readonly kinds: Readonly<Record<string, AnyKind<Ctx>>>;
  readonly modes: Readonly<Record<string, AnyMode>>;
  readonly rewards?: SubjectCore<Ctx, F>['rewards'];
  readonly gameRecordOf?: SubjectCore<Ctx, F>['gameRecordOf'];
  readonly settings: SubjectSettingsSlot;
}

/** `settings` is the slot the runtime exposes: the subject's own by default, or a multi-subject composition
 * (`composeSettingsSlots`) so settings stay flat across every registered subject. */
export function createSubjectRuntime<Ctx, F = unknown>(
  core: SubjectCore<Ctx, F>,
  settings: SubjectSettingsSlot = core.settings,
): SubjectRuntime<Ctx, F> {
  return {
    kinds: core.kinds,
    modes: { ...core.modes, series: createSeriesMode(core.kinds) },
    rewards: core.rewards,
    gameRecordOf: core.gameRecordOf?.bind(core),
    settings,
  };
}
