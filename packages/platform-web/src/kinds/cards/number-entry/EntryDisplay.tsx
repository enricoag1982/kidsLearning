import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

export interface EntryDisplayProps {
  /** The digits typed so far (`?` while empty). */
  readonly entry: string;
  /** The last wrong answer: orange and struck through until the next digit. */
  readonly wrongValue?: number;
  readonly solved: boolean;
  /** Takes the whole board (an exercise without a prompt card), else a 80 px strip. */
  readonly grow: boolean;
}

/** What the kid has typed, big, announced politely as it changes; only the number is struck when it was wrong. */
export function EntryDisplay({ entry, wrongValue, solved, grow }: EntryDisplayProps): JSX.Element {
  const { t } = useTranslation();
  const showWrong = entry === '' && wrongValue !== undefined;
  const value = showWrong ? String(wrongValue) : entry === '' ? '?' : entry;
  const tone = showWrong ? 'text-today line-through' : solved ? 'text-go' : 'text-ink';
  return (
    <div
      className={`flex items-center justify-center rounded-3xl border-2 border-line bg-card font-display font-bold ${
        grow ? 'h-full w-full text-7xl' : 'h-20 shrink-0 text-5xl'
      }`}
    >
      <output aria-live="polite" aria-label={t('cards.entry-label', { value })} className={tone}>
        {value}
      </output>
    </div>
  );
}
