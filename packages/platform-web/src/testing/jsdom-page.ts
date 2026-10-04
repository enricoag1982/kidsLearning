// A Playwright-`Page` look-alike over the jsdom document: the one call the card kit's e2e drivers make,
// `page.getByRole(role, { name, exact }).click()`, answered with Testing Library. It runs a driver against the real UI in a unit test.
import { fireEvent, screen } from '@testing-library/react';

interface RoleOptions {
  readonly name?: string | RegExp;
  readonly exact?: boolean;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Playwright's string `name` matches a substring unless `exact`; Testing Library's matches the whole name. */
function nameMatcher({ name, exact }: RoleOptions): string | RegExp | undefined {
  if (typeof name === 'string' && exact !== true) return new RegExp(escapeRegExp(name), 'i');
  return name;
}

export interface JsdomPage {
  getByRole(
    role: string,
    options?: RoleOptions,
  ): {
    /** Waits (like Playwright) for the element to appear, then clicks it. */
    click(): Promise<void>;
  };
}

/** `Page` for a driver's `perform`: pass `jsdomPage() as unknown as Parameters<Driver['perform']>[0]`. */
export function jsdomPage(): JsdomPage {
  return {
    getByRole(role, options = {}) {
      return {
        async click() {
          const element = await screen.findByRole(role, {
            name: nameMatcher(options),
          });
          fireEvent.click(element);
        },
      };
    },
  };
}
