import { StrictMode } from 'react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import i18next from 'i18next';
import type { InitOptions } from 'i18next';
import type { AppConfig } from '@learn/platform-core';
import App from './App.tsx';
import { AppErrorBoundary, StartFailed } from './ui/AppErrorBoundary.tsx';
import { createAppUpdate } from './adapters/app-update.ts';
import type { RegisterSW } from './adapters/app-update.ts';
import { createAppServices } from './app/services.ts';
import type { SubjectEntry, SubjectWeb } from './app/subject.ts';
import { initI18n } from './i18n.ts';

export interface MountAppOptions {
  /** Every subject the app hosts, in hub order; the first is the default. Their packs load on demand (`SubjectEntry.load`). */
  readonly subjects: readonly SubjectEntry[];
  readonly app: Omit<AppConfig, 'version'>;
  /** `virtual:pwa-register`'s `registerSW`, passed in so tests never touch the virtual module. */
  readonly registerSW: RegisterSW;
}

/** `pack.dev[hash]`; a key ending in `=` matches as a prefix (`#lesson=<id>`). */
function findDevScreen(
  dev: NonNullable<SubjectWeb['dev']>,
  hash: string,
): (() => Promise<ComponentType>) | undefined {
  return Object.entries(dev).find(
    ([key]) => key === hash || (key.endsWith('=') && hash.startsWith(key)),
  )?.[1];
}

/** English texts of the error screen for a start that fails before any subject bundle is loaded (a missing pack chunk): the
 * only strings the platform needs without one. Mirrors `app-error` in the platform's `common.yaml`. */
export const START_FAILED_RESOURCES = {
  en: {
    common: {
      'app-error': {
        title: 'Oops, something went wrong',
        body: 'Tap "Try again". If this keeps happening, ask a grown-up to send the text below to the app\'s maker.',
        retry: 'Try again',
      },
    },
  },
};

/** The app's composition root: error boundary, update wiring, the first subject's pack and texts (the last one used, else the
 * first) and, in dev builds only, the pack's playgrounds. A start that fails (missing root element, pack chunk that cannot load,
 * unreadable storage) shows the error screen instead of a blank page; a missing root element rejects. */
export async function mountApp({ subjects, app, registerSW }: MountAppOptions): Promise<void> {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element "#root" not found');
  }
  const root = createRoot(rootElement);
  try {
    const appUpdate = createAppUpdate(registerSW);
    const appServices = createAppServices(subjects, app);
    const services = await appServices.activate(await appServices.initialSubjectId());
    // The loaded bundles are plain JSON of the shape i18next takes (language → namespace → keys).
    initI18n(services.locales as InitOptions['resources']);

    const { pack } = services;
    const devScreen =
      import.meta.env.DEV && pack.dev ? findDevScreen(pack.dev, location.hash) : undefined;
    if (devScreen) {
      const Screen = await devScreen();
      root.render(
        <StrictMode>
          <Screen />
        </StrictMode>,
      );
      return;
    }
    root.render(
      <StrictMode>
        <AppErrorBoundary>
          <App services={services} appUpdate={appUpdate} />
        </AppErrorBoundary>
      </StrictMode>,
    );
  } catch (error) {
    if (!i18next.isInitialized) {
      initI18n(START_FAILED_RESOURCES);
    }
    root.render(
      <StrictMode>
        <AppErrorBoundary>
          <StartFailed error={error} />
        </AppErrorBoundary>
      </StrictMode>,
    );
  }
}
