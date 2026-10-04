// The math pack with its merged locale bundle, what `mathEntry.load()` resolves to; kept apart from `entry.ts` so
// this module (and everything behind it) is a lazy chunk.
import type { LoadedSubject } from '@learn/platform-web/app/subject.ts';
import en from '../../dist/locales/en.json';
import { mathWeb } from './math-pack.ts';

export const mathLoaded: LoadedSubject = { pack: mathWeb, locales: { en } };
