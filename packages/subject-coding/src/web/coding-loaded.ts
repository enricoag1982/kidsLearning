// The coding pack with its merged locale bundle, what `codingEntry.load()` resolves to; kept apart from `entry.ts`
// so this module (and everything behind it) is a lazy chunk.
import type { LoadedSubject } from '@learn/platform-web/app/subject.ts';
import en from '../../dist/locales/en.json';
import { codingWeb } from './coding-pack.ts';

export const codingLoaded: LoadedSubject = { pack: codingWeb, locales: { en } };
