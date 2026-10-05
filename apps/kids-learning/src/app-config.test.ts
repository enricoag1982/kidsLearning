import { describe, expect, it } from 'vitest';
import { KIDS_TEST_APP_CONFIG } from '@learn/platform-web/testing/kids-app-config.ts';
import { KIDS_APP_CONFIG } from './app-config.ts';

describe('KIDS_APP_CONFIG', () => {
  // Chess's tests wire one subject by hand with `KIDS_TEST_APP_CONFIG` (`createTestServices`); a drift would let them
  // pass on identifiers the deployed app does not use.
  it('is the config the shared kids test wiring uses', () => {
    expect(KIDS_TEST_APP_CONFIG).toEqual(KIDS_APP_CONFIG);
  });
});
