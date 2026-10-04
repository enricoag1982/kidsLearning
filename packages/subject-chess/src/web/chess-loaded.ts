// The chess pack with its merged locale bundle, what `chessEntry.load()` resolves to; kept apart from `entry.ts` so
// this module (and everything behind it) is a lazy chunk.
import type { LoadedSubject } from '@learn/platform-web/app/subject.ts';
import en from '../../dist/locales/en.json';
import { chessWeb } from './chess-pack.ts';

export const chessLoaded: LoadedSubject = { pack: chessWeb, locales: { en } };
