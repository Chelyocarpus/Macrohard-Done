import { useEffect } from 'react';
import { AlertTriangle, Bell, BellOff, CheckCircle } from 'lucide-react';
import { useReminderStore } from '../stores/reminderStore.ts';
import { Button } from './ui/Button.tsx';
import { cn } from '../utils/cn.ts';

/**
 * Settings > Reminders: turn system notifications on or off on this device, and send a test.
 * Reminders always appear inside the app while it is open; the notifications are what reach you when it is in the background.
 */
export function ReminderSettings() {
  const enabled = useReminderStore((state) => state.enabled);
  const permission = useReminderStore((state) => state.permission);
  const busy = useReminderStore((state) => state.busy);
  const notice = useReminderStore((state) => state.notice);
  const refreshPermission = useReminderStore((state) => state.refreshPermission);
  const turnOn = useReminderStore((state) => state.turnOn);
  const turnOff = useReminderStore((state) => state.turnOff);
  const sendTest = useReminderStore((state) => state.sendTest);

  // The browser's own settings can change while this page is open
  useEffect(() => {
    refreshPermission();
    window.addEventListener('focus', refreshPermission);
    return () => window.removeEventListener('focus', refreshPermission);
  }, [refreshPermission]);

  const on = enabled && permission === 'granted';

  const status = permission === 'unsupported'
    ? 'This browser cannot show notifications here. Reminders still appear inside the app while it is open.'
    : permission === 'denied'
      ? 'Your browser blocks notifications for this site. Allow them in the site settings of your browser (the lock icon next to the address) to turn this on.'
      : on
        ? 'On. You get a notification at the time of a reminder while the app is open, also in a background tab or an installed app that is running.'
        : 'Off. Reminders appear inside the app while you are looking at it. Turn notifications on to be alerted when the app is in the background.';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line px-3 py-2.5">
        {on ? <Bell size={20} className="flex-shrink-0 text-accent" aria-hidden="true" /> : <BellOff size={20} className="flex-shrink-0 text-muted" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Notifications on this device</p>
          <p className="text-xs text-muted" id="reminder-status">{status}</p>
        </div>
        {on ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => { void sendTest(); }} disabled={busy} aria-describedby="reminder-status">Send a test</Button>
            <Button variant="secondary" size="sm" onClick={turnOff} disabled={busy}>Turn off</Button>
          </div>
        ) : permission === 'unsupported' || permission === 'denied' ? null : (
          <Button variant="secondary" size="sm" onClick={() => { void turnOn(); }} disabled={busy} aria-describedby="reminder-status">
            {busy ? 'Waiting for your browser…' : 'Turn on notifications'}
          </Button>
        )}
      </div>

      {notice && (
        <div
          className={cn(
            'flex gap-3 rounded-lg border bg-canvas p-3 text-sm',
            notice.kind === 'ok' ? 'border-done/40' : notice.kind === 'warning' ? 'border-important/50' : 'border-overdue/40',
          )}
          role="status"
        >
          {notice.kind === 'ok'
            ? <CheckCircle size={18} className="mt-0.5 flex-shrink-0 text-done" aria-hidden="true" />
            : <AlertTriangle size={18} className={cn('mt-0.5 flex-shrink-0', notice.kind === 'warning' ? 'text-important' : 'text-overdue')} aria-hidden="true" />}
          <p className="min-w-0 text-ink">{notice.text}</p>
        </div>
      )}

      <p className="text-xs text-muted">
        A closed app cannot alert you: this app has no server to wake your device. A reminder that came due while the app was closed alerts when you open it again (up to a day later). On an iPhone, add the app to your Home Screen first.
        Only the profile you are in alerts; this setting is shared by all profiles.
      </p>
    </div>
  );
}
