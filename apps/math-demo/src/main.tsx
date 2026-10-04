import { mountApp } from '@learn/platform-web/mount.tsx';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import './index.css';
import { MATH_APP_CONFIG, mathEntry } from '@learn/subject-math/entry';

void mountApp({ subjects: [mathEntry], app: MATH_APP_CONFIG, registerSW });
