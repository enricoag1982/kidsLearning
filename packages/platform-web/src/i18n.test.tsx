import i18next from 'i18next';
import { act, render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setSubjectLocales } from './i18n.ts';

function Title() {
  const { t } = useTranslation();
  return <h1>{t('app.title')}</h1>;
}

beforeAll(() => {
  initI18n({ en: { common: { app: { title: 'Start' }, shared: 'Shared' } } });
});

describe('setSubjectLocales', () => {
  it('replaces the bundles, so a key of the previous subject does not survive', () => {
    setSubjectLocales({ en: { common: { app: { title: 'One' }, only: 'Only one' } } });
    expect(i18next.t('only')).toBe('Only one');

    setSubjectLocales({ en: { common: { app: { title: 'Two' } } } });

    expect(i18next.t('app.title')).toBe('Two');
    expect(i18next.t('only')).toBe('only');
    expect(i18next.t('shared')).toBe('shared');
  });

  it('removes a namespace the new bundles lack', () => {
    setSubjectLocales({
      en: { common: { app: { title: 'One' } }, journey: { ui: { map: 'Map' } } },
    });
    expect(i18next.t('journey:ui.map')).toBe('Map');

    setSubjectLocales({ en: { common: { app: { title: 'Two' } } } });

    expect(i18next.t('journey:ui.map')).toBe('ui.map');
  });

  it('leaves a language the new bundles do not mention alone', () => {
    setSubjectLocales({ de: { common: { app: { title: 'Eins' } } } });
    setSubjectLocales({ en: { common: { app: { title: 'Two' } } } });

    expect(i18next.getResource('de', 'common', 'app.title')).toBe('Eins');
    expect(i18next.getResource('en', 'common', 'app.title')).toBe('Two');
  });

  it('re-renders a mounted component', () => {
    setSubjectLocales({ en: { common: { app: { title: 'First' } } } });
    render(<Title />);
    expect(screen.getByRole('heading').textContent).toBe('First');

    act(() => {
      setSubjectLocales({ en: { common: { app: { title: 'Second' } } } });
    });

    expect(screen.getByRole('heading').textContent).toBe('Second');
  });
});

describe('initI18n', () => {
  it('works on a copy: the given resources survive subject switches, so a switch back finds them', () => {
    const first = { en: { common: { app: { title: 'First' }, only: 'Only first' } } };
    const copy = JSON.parse(JSON.stringify(first)) as typeof first;
    initI18n(first);

    setSubjectLocales({ en: { common: { app: { title: 'Second' } } } });
    expect(i18next.t('app.title')).toBe('Second');
    expect(first).toEqual(copy);

    setSubjectLocales(first);
    expect(i18next.t('app.title')).toBe('First');
    expect(i18next.t('only')).toBe('Only first');
  });
});
