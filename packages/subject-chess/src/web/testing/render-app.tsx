import { render, screen, type RenderResult } from '@testing-library/react';
import App from '@learn/platform-web/App.tsx';
import type { AppProps } from '@learn/platform-web/App.tsx';
import type { Services } from '@learn/platform-web/app/services.ts';
import { pickProfileFromPicker } from './app-test-helpers.ts';

/**
 * Renders the app over `services` and gets past the picker: `at: 'home'` taps the tile named
 * `nickname` (default `'Mia'`) — the caller seeds that returning profile first —
 * landing on Home; `at: 'picker'` renders and waits for the picker itself, without picking anyone
 * (first-run/onboarding tests, with no profile yet, use `renderAppRaw` instead).
 */
export async function renderApp(
  services: Services,
  options: { readonly at: 'home'; readonly nickname?: string } | { readonly at: 'picker' },
): Promise<RenderResult> {
  const result = renderAppRaw(services);
  if (options.at === 'home') {
    await pickProfileFromPicker(options.nickname ?? 'Mia');
  } else {
    await screen.findByRole('heading', { name: "Who's playing today?" });
  }
  return result;
}

/** Renders `<App>` over `services` (the chess pack active), as `mountApp` composes it. */
export function renderAppRaw(
  services: Services,
  props: Omit<AppProps, 'services'> = {},
): RenderResult {
  return render(<App services={services} {...props} />);
}
