import { createPages } from '@learn/platform-web/e2e/pages.ts';
import { contentText } from './i18n.ts';

/** The shared page flows bound to the chess subject of the Kids Learning app (through the subjects hub): its Home title and locale. */
export const {
  completeFirstRunToPlacementOffer,
  completeFirstRun,
  dismissCelebrationIfShown,
  pickProfileFromPicker,
  openSubject,
  startLessonToFirstGuided,
  openParentArea,
} = createPages({ appTitle: contentText('app.title'), texts: { contentText }, subjectId: 'chess' });
