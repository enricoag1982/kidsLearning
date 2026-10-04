import i18next, { type InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { LoadedSubject } from './app/subject.ts';
import { i18nOptions } from './i18n-options.ts';

// Resources are bundled at build time, so init completes synchronously: the
// first render already has translated text (no loading flash, no suspense).
//
// i18next keeps the `resources` object it is given as its own store and edits it in place (`removeResourceBundle` deletes
// from it, `addResourceBundle` adds to it), so it gets a copy. `LoadedSubject.locales` is shared with the subject's cached
// `Services`: edited, the first subject's texts would be gone when a later switch comes back to it.
export function initI18n(resources: InitOptions['resources']): void {
  const own =
    resources === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(resources)) as InitOptions['resources']);
  void i18next.use(initReactI18next).init(i18nOptions(own));
}

/** Swaps the loaded resources for a subject's merged bundles (`LoadedSubject.locales`, multi-subject.md D8): per language and
 * namespace the old bundle is removed first, so no key of the previous subject survives; a namespace of a language that the
 * new bundles lack is removed too. Mounted components re-render (`react.bindI18nStore`). */
export function setSubjectLocales(locales: LoadedSubject['locales']): void {
  for (const [lng, namespaces] of Object.entries(locales)) {
    for (const ns of Object.keys(i18next.store.data[lng] ?? {})) {
      if (!(ns in namespaces)) i18next.removeResourceBundle(lng, ns);
    }
    for (const [ns, bundle] of Object.entries(namespaces)) {
      i18next.removeResourceBundle(lng, ns);
      i18next.addResourceBundle(lng, ns, bundle, false, true);
    }
  }
}
