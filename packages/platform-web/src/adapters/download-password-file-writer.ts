import type { PasswordFileWriter } from '@learn/platform-core';
import { triggerDownload } from './download.ts';

function fileText(appTitle: string, password: string): string {
  return `${appTitle} — parent code: ${password}\nKeep this file. The app asks for this code before the grown-ups area.\n`;
}

/** Browsers cannot write to a fixed path, so this downloads a plain-text copy of the password (app-structure.md §2);
 * `filePrefix` is `AppConfig.parentCodeFilePrefix`, `appTitle` is `AppConfig.title`. */
export function createDownloadPasswordFileWriter(
  filePrefix: string,
  appTitle: string,
): PasswordFileWriter {
  const fileName = `${filePrefix}.txt`;
  const location = `Downloads/${fileName}`;
  return {
    write(password: string): Promise<{ location: string }> {
      triggerDownload(fileName, fileText(appTitle, password), 'text/plain');
      return Promise.resolve({ location });
    },
  };
}
