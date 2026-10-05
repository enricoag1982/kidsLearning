import { devices } from '@playwright/test';
import { defineE2EConfig } from '@learn/platform-web/build/e2e-config.ts';

// The layout checks (`e2e/fit.spec.ts`, `e2e/coding/fit.spec.ts`) run on the phone and iPad mini projects only; `e2e/logic/fit.spec.ts`
// sets its own viewports and runs in `chromium` with the other logic specs.
const FIT_SPECS = /e2e[\\/](coding[\\/])?fit\.spec\.ts/;

export default defineE2EConfig({
  port: 4173,
  projects: [
    // Every spec but the layout checks; `e2e/math/`, `e2e/coding/` and `e2e/logic/` (those subjects' specs) run here only.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: FIT_SPECS },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
      },
      testIgnore: [/fit\.spec\.ts/, /[\\/]math[\\/]/, /[\\/]coding[\\/]/, /[\\/]logic[\\/]/],
    },
    // Layout checks (accessibility + kid touch-target sizes) on the stacked layouts.
    {
      name: 'tablet-portrait',
      testMatch: /a11y\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    // Also runs `fit.spec.ts` (phone-width stacked layout).
    {
      name: 'phone',
      testMatch: [/a11y\.spec\.ts/, FIT_SPECS],
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    // iPad mini 4 fit (owner report, iOS 15.8 Safari, 2026-09-26): viewport = Safari's VISIBLE
    // area — status 20 + address bar 50 + tab bar 0–36 px off 1024x768 → 918–954 portrait (900
    // used), 662–698 landscape (660 used). Chromium has no toolbar quirk.
    {
      name: 'ipad-mini-portrait',
      testMatch: FIT_SPECS,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 900 }, hasTouch: true },
    },
    {
      name: 'ipad-mini-landscape',
      testMatch: FIT_SPECS,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 660 }, hasTouch: true },
    },
  ],
});
