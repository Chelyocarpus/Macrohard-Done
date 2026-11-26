/**
 * The quiet line under a page title: today's date in My Day, how many tasks are open in the other task pages,
 * and nothing in Search and Settings (they are not lists of tasks).
 */
// English on purpose: the app's words are English, so a German browser must not show "Mittwoch, 25. November" under them
export function headerSubtitle(view: string, openCount: number, now: Date = new Date()): string | undefined {
  if (view === 'search' || view === 'settings') return undefined;
  if (view === 'my-day') return now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  if (!Number.isFinite(openCount) || openCount < 0) return undefined;
  if (openCount === 0) return 'Nothing to do';
  return openCount === 1 ? '1 open task' : `${openCount} open tasks`;
}
