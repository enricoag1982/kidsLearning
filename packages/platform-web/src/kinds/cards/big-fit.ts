/** Width of one character of a card's big text, in em: the widest measured in Fredoka Bold over every `prompt.big` of the packs is
 * 0.6 em per character (a row of arrows; numbers with spaces and signs run 0.42 to 0.5), so a text this wide per character always fits. */
const EM_PER_CHARACTER = 0.6;

/** The font size, in `cqi` (1% of the card's width), at which `text` fills the card's width on one line: 100 / (0.6 x characters),
 * to 2 decimals. `CardPromptView` sets it as `--big-fit`; the stylesheet (`.card-big`) keeps it between 1.5 rem and 3 rem (3.75 rem from
 * `sm`), so a short text keeps its size and a long one (a 16-character number row) shrinks to fit a phone's card. */
export function bigFitCqi(text: string): number {
  const characters = Math.max(1, Array.from(text).length);
  return Math.round(10000 / (EM_PER_CHARACTER * characters)) / 100;
}
