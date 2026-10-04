// The starter subject's pack with its merged locale bundle, what `templateEntry.load()` resolves to; kept apart from `entry.ts`
// so this module (and everything behind it) is a lazy chunk.
import type { LoadedSubject } from '@learn/platform-web/app/subject.ts';
import en from '../../dist/locales/en.json';
import { templateWeb } from './template-pack.ts';

export const templateLoaded: LoadedSubject = { pack: templateWeb, locales: { en } };
