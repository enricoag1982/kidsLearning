// The logic pack with its merged locale bundle, what `logicEntry.load()` resolves to; kept apart from `entry.ts`
// so this module (and everything behind it) is a lazy chunk.
import type { LoadedSubject } from '@learn/platform-web/app/subject.ts';
import en from '../../dist/locales/en.json';
import { logicWeb } from './logic-pack.ts';

export const logicLoaded: LoadedSubject = { pack: logicWeb, locales: { en } };
