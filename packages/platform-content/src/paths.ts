import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Platform locale YAML root (`<root>/<lang>/<namespace>.yaml`), merged with a subject's own. Built with `join`, not
 * `new URL('…', import.meta.url)`: Vite's asset transform rewrites that form in a browser-environment (jsdom) test. */
export const PLATFORM_LOCALES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'locales');
