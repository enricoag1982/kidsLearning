import 'i18next';
import type chessEn from '@learn/subject-chess/dist/locales/en.json';
import type codingEn from '@learn/subject-coding/dist/locales/en.json';
import type logicEn from '@learn/subject-logic/dist/locales/en.json';
import type mathEn from '@learn/subject-math/dist/locales/en.json';

// Types `t()` against the real English locales of every subject: unknown keys fail typecheck.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof chessEn & typeof mathEn & typeof codingEn & typeof logicEn;
  }
}
