// The text keys of Race to N's spoken lines (`content/locales/en/lessons.yaml`, `race:`): the board speaks them after each move and the
// content's voice inventory lists every one it can speak, so both read the keys from here. Pure data: no React, no i18n.

/** The bot's move: "{{bot}} adds {{step}}. Now it's {{total}}." */
export const RACE_BOT_ADDS = 'lessons:race.bot-adds';
/** The kid's move: "You add {{step}}. Now it's {{total}}." */
export const RACE_YOU_ADD = 'lessons:race.you-add';
/** Said after the bot's move when it is the kid's turn again. */
export const RACE_YOUR_TURN = 'lessons:race.your-turn';
