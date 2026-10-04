import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { PackProvider } from '@learn/platform-web/app/subject.ts';
import { logicWeb } from '../logic-pack.ts';

/** `ui` under the logic pack (its kind UIs) and the English texts the test setup loads. */
export function renderGridUi(ui: ReactElement): ReturnType<typeof render> {
  return render(<PackProvider value={logicWeb}>{ui}</PackProvider>);
}
