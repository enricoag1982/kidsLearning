import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContent, exitOnContentError } from '@learn/platform-content/build';
import { codingContent } from '../src/content.ts';

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));

await buildContent({
  subject: codingContent,
  root: join(packageDir, 'content'),
  out: join(packageDir, 'dist'),
}).catch(exitOnContentError);
