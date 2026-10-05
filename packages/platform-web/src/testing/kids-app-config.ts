import type { AppConfig } from '@learn/platform-core';

/** The deployed app's identifiers (`apps/kids-learning` `KIDS_APP_CONFIG`; `app-config.test.ts` there keeps the two equal), for
 * tests that wire one subject by hand over a single store (`createTestServices`, `makeDeps`): shared prefix `kids:`, backup app id
 * `kids-learning`, Chess for Kids' older backup files accepted. */
export const KIDS_TEST_APP_CONFIG: Omit<AppConfig, 'version'> = {
  storagePrefix: 'kids:',
  backupAppId: 'kids-learning',
  backupFilePrefix: 'kids-learning',
  parentCodeFilePrefix: 'kids-learning-parent-code',
  title: 'Kids Learning',
  legacyBackupApps: { 'chess-kids': 'chess', 'math-demo': 'math' },
};
