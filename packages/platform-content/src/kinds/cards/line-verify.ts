// The card kit's number-line picture rules over a compiled exercise (or demo): the line goes up, its step divides it into 2-20 gaps,
// and every mark sits on the line.
import type { CardPrompt } from '@learn/platform-core/domain/exercise/kinds/cards/prompt';
import {
  MAX_LINE_GAPS,
  MIN_LINE_GAPS,
} from '@learn/platform-core/domain/exercise/kinds/cards/prompt';

/** The def field the rules read. */
interface LineCarrier {
  readonly prompt?: CardPrompt;
}

/** Every line rule for one exercise def or demo (anything that may carry `prompt`). */
export function verifyCardLine(def: object, where: string, issues: string[]): void {
  // One trust point: a card def is read through the field the line rules look at, the rest is ignored.
  const line = (def as LineCarrier).prompt?.line;
  if (line === undefined) return;
  const { from, to, step, marks } = line;
  if (from >= to) {
    issues.push(`${where}: line from ${String(from)} to ${String(to)} must go up (from < to)`);
    return;
  }
  const gaps = (to - from) / step;
  if (!Number.isInteger(gaps)) {
    issues.push(
      `${where}: line step ${String(step)} does not divide from ${String(from)} to ${String(to)} into whole gaps`,
    );
  } else if (gaps < MIN_LINE_GAPS || gaps > MAX_LINE_GAPS) {
    issues.push(
      `${where}: line has ${String(gaps)} gaps, needs ${String(MIN_LINE_GAPS)} to ${String(MAX_LINE_GAPS)}`,
    );
  }
  for (const mark of marks) {
    if (mark < from || mark > to) {
      issues.push(
        `${where}: line mark ${String(mark)} is off the line from ${String(from)} to ${String(to)}`,
      );
    }
  }
}
