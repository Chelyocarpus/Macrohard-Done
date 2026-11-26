import { useState, type FormEvent } from 'react';
import { useSyncStore } from '../stores/syncStore.ts';
import { formatDateTime } from '../utils/dateUtils.ts';
import { useDateTimePrefs } from '../stores/dateFormatStore.ts';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';

const MIN_PASSWORD = 8;

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return formatDateTime(date); // '' for an invalid date
}

/** Settings > Account: sign in to keep your tasks in sync across devices (needs the cloud set up, see README). */
export function AccountSection() {
  useDateTimePrefs(); // dates below follow the chosen style
  const phase = useSyncStore((s) => s.phase);
  const email = useSyncStore((s) => s.email);
  const message = useSyncStore((s) => s.message);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const cloudUpdatedAt = useSyncStore((s) => s.cloudUpdatedAt);
  const authBusy = useSyncStore((s) => s.authBusy);

  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [formError, setFormError] = useState<string | null>(null);

  if (phase === 'off') {
    return (
      <p className="text-sm text-muted">
        Syncing between devices is not available in this app. Your tasks are saved on this device only.
      </p>
    );
  }

  if (phase === 'signed-out') {
    const submit = async (event: FormEvent) => {
      event.preventDefault();
      if (authBusy) return;
      if (password.length < MIN_PASSWORD) {
        setFormError(`Use a password with at least ${MIN_PASSWORD} characters.`);
        return;
      }
      const store = useSyncStore.getState();
      const error = await (mode === 'sign-in' ? store.signIn(address.trim(), password) : store.signUp(address.trim(), password));
      setFormError(error);
      if (!error) setPassword('');
    };
    return (
      <form onSubmit={(event) => { void submit(event); }} className="max-w-sm space-y-3">
        <Input label="Email" type="email" autoComplete="email" required value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input
          label="Password"
          type="password"
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {formError && <p role="alert" className="text-sm text-overdue">{formError}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={authBusy}>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</Button>
          <button
            type="button"
            className="text-sm text-accent underline"
            onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setFormError(null); }}
          >
            {mode === 'sign-in' ? 'Create an account instead' : 'I already have an account'}
          </button>
        </div>
        <p className="text-xs text-muted">Signing in uploads your tasks to your account, one profile at a time. Without an account everything stays on this device.</p>
      </form>
    );
  }

  const store = useSyncStore.getState();
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink">Signed in as <strong>{email}</strong></p>

      {phase === 'conflict' ? (
        <div role="alert" className="rounded-lg border border-important/50 bg-canvas p-3 text-sm text-ink">
          <p className="font-medium">This device and your account have different data.</p>
          <p className="mt-1 text-muted">
            {cloudUpdatedAt ? `The account copy was saved ${formatTime(cloudUpdatedAt)}. ` : ''}
            Nothing is merged. Choose which copy to keep; the other one is replaced. If you keep the account copy, this device&apos;s
            earlier data is kept for undo under Settings &gt; Data.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { void store.resolveConflict('cloud'); }}>Keep the account copy</Button>
            <Button size="sm" variant="secondary" onClick={() => { void store.resolveConflict('device'); }}>Keep this device&apos;s data</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted" role="status">
          {phase === 'syncing' && 'Syncing…'}
          {phase === 'idle' && (lastSyncedAt ? `Up to date. Last synced ${formatTime(lastSyncedAt)}.` : 'Up to date.')}
          {phase === 'error' && `Not synced: ${message ?? 'something went wrong.'} Your data is safe on this device.`}
          {phase === 'unknown' && `${message ?? 'The last upload could not be confirmed.'}`}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={phase === 'syncing' || phase === 'conflict'} onClick={() => { void store.syncNow(); }}>
          Sync now
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { void store.signOut(); }}>Sign out</Button>
      </div>
      <p className="text-xs text-muted">Signing out keeps the data on this device.</p>
    </div>
  );
}
