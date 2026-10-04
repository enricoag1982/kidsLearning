import 'i18next';
import type chessEn from '@learn/subject-chess/dist/locales/en.json';
import type mathEn from '@learn/subject-math/dist/locales/en.json';

// Types `t()` against the real English locales of both subjects: unknown keys fail typecheck.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof chessEn & typeof mathEn;
  }
}
