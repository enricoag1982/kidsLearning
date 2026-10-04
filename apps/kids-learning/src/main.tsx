// Import order fixes the entry chunk's module order, which moves the initial JS by ~0.5 KB.
import { mountApp } from '@learn/platform-web/mount.tsx';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import './index.css';
import { chessEntry } from '@learn/subject-chess/entry';
import { mathEntry } from '@learn/subject-math/entry';
import { codingEntry } from '@learn/subject-coding/entry';
// new-subject:import
import { KIDS_APP_CONFIG } from './app-config.ts';

void mountApp({
  subjects: [
    chessEntry,
    mathEntry,
    codingEntry,
    // new-subject:entry
  ],
  app: KIDS_APP_CONFIG,
  registerSW,
});
