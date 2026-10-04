// Import order fixes the entry chunk's module order, which moves the initial JS by ~0.5 KB.
import { mountApp } from '@learn/platform-web/mount.tsx';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import './index.css';
import { CHESS_APP_CONFIG, chessEntry } from '@learn/subject-chess/entry';

void mountApp({ subjects: [chessEntry], app: CHESS_APP_CONFIG, registerSW });
