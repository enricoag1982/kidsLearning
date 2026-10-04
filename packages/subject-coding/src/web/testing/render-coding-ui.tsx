import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { PackProvider } from '@learn/platform-web/app/subject.ts';
import { codingWeb } from '../coding-pack.ts';

/** `ui` under the coding pack (its art and kind UIs) and the English texts the test setup loads. */
export function renderCodingUi(ui: ReactElement): ReturnType<typeof render> {
  return render(<PackProvider value={codingWeb}>{ui}</PackProvider>);
}
