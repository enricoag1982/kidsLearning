import type { DemoContent, StimulusContent } from '../../subject.ts';
import { z } from 'zod';
import { textRefSchema } from '../../schema.ts';
import { compilePrompt, promptSchema } from './prompt.ts';
import { verifyCardLine } from './line-verify.ts';
import { verifyCardShapes } from './shape-verify.ts';

const withPromptSchema = z.object({ prompt: promptSchema.optional() });

/** The stimulus: an optional `prompt` (`emoji`, `big`, `image`, `shapes`, `line`), compiled into the def's head; the shape rules
 * (`shape-verify.ts`) check the compiled def's prompt row and item shapes, the line rules (`line-verify.ts`) its number line. */
export const cardStimulus: StimulusContent = {
  compile(raw) {
    const parsed = withPromptSchema.safeParse(raw);
    const prompt = parsed.success ? parsed.data.prompt : undefined;
    return { head: prompt === undefined ? {} : { prompt: compilePrompt(prompt) }, tail: {} };
  },
  check: (def, at) => {
    verifyCardShapes(def, at.where, at.issues);
    verifyCardLine(def, at.where, at.issues);
  },
};

/** A lesson demo: an optional spoken-text key (default `<lesson-id>.demo`) and an optional prompt shown on the card. */
const cardDemoSchema = z
  .object({ text: textRefSchema.optional(), prompt: promptSchema.optional() })
  .strict();

export const cardDemo: DemoContent = {
  schema: cardDemoSchema,

  compile(raw, textKey) {
    const parsed = cardDemoSchema.safeParse(raw);
    const prompt = parsed.success ? parsed.data.prompt : undefined;
    return { textKey, ...(prompt === undefined ? {} : { prompt: compilePrompt(prompt) }) };
  },
  check: (demo, at) => {
    verifyCardShapes(demo, at.where, at.issues);
    verifyCardLine(demo, at.where, at.issues);
  },
};
