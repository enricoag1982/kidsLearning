import type { InitOptions } from 'i18next';

/** Split from `i18n.ts` so the e2e kit's standalone instance inits with the same options and resolves identical strings. */
export function i18nOptions(resources: InitOptions['resources']): InitOptions {
  return {
    resources,
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'lessons', 'characters', 'journey', 'rewards'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    // A subject switch swaps the resource bundles (`setSubjectLocales`): mounted components re-render on it.
    react: { bindI18nStore: 'added removed' },
  };
}
