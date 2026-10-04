import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { PackProvider } from '@learn/platform-web/app/subject.ts';
import { mathWeb } from '../math-pack.ts';

/** `ui` under the math pack (its art and kind UIs) and the English texts the test setup loads. */
export function renderMathUi(ui: ReactElement): ReturnType<typeof render> {
  return render(<PackProvider value={mathWeb}>{ui}</PackProvider>);
}
