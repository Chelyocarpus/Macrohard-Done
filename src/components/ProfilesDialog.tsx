import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from './ui/Button.tsx';
import { ProfileAvatar } from './ProfileAvatar.tsx';
import { cn } from '../utils/cn.ts';
import { useEscapeKey } from '../hooks/useEscapeKey.ts';
import { useProfileStore } from '../stores/profileStore.ts';
import { useSyncStore } from '../stores/syncStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { keysFor, MAX_PROFILES, MAX_PROFILE_NAME, PROFILE_COLORS, type Profile } from '../utils/profiles.ts';

const FIELD_CLASS = 'h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** How many tasks another profile holds, read straight from its saved data (null when that can't be read) */
function countTasks(profileId: string): number | null {
  try {
    const text = localStorage.getItem(keysFor(profileId).data);
    if (text === null) return 0;
    const parsed = JSON.parse(text) as { tasks?: unknown };
    return Array.isArray(parsed.tasks) ? parsed.tasks.length : 0;
  } catch {
    return null;
  }
}

function ColorChoice({ value, onChange, name }: { value: string; onChange: (color: string) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={`Colour for ${name}`} className="flex flex-wrap gap-2">
      {PROFILE_COLORS.map((color) => {
        const selected = color.value.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={color.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color.label}
            onClick={() => onChange(color.value)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-canvas transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10',
              selected && 'ring-2 ring-ink',
            )}
            style={{ backgroundColor: color.value }}
          >
            {selected && <Check size={16} className="text-white mix-blend-difference" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

function ProfileRow({ profile, isCurrent, onlyOne }: { profile: Profile; isCurrent: boolean; onlyOne: boolean }) {
  const phase = useSyncStore((state) => state.phase);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [color, setColor] = useState(profile.color);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [taskCount, setTaskCount] = useState<number | null>(null);

  const cancelInner = () => { setEditing(false); setConfirming(false); setError(null); setName(profile.name); setColor(profile.color); };
  // Escape closes the rename form or the delete question first, the dialog only on the next press
  useEscapeKey(editing || confirming, cancelInner);

  const save = (event: FormEvent) => {
    event.preventDefault();
    const result = useProfileStore.getState().update(profile.id, { name, color });
    if (!result.ok) { setError(result.error); return; }
    setEditing(false);
    setError(null);
  };

  const askDelete = () => {
    setTaskCount(countTasks(profile.id));
    setConfirming(true);
    setError(null);
  };

  const confirmDelete = async () => {
    if (busy) return;
    setBusy(true);
    const result = await useProfileStore.getState().remove(profile.id);
    setBusy(false);
    if (!result.ok) { setError(result.error); setConfirming(false); return; }
    // The row disappears with the profile; unused data that could not be removed is reported, not hidden
    if (result.warning) useToastStore.getState().showWarning('Profile deleted, with a leftover', result.warning);
  };

  const signedIn = phase !== 'off' && phase !== 'signed-out';
  const deleteDisabledReason = isCurrent ? 'Switch to another profile first to delete this one.' : onlyOne ? 'You need at least one profile.' : null;

  return (
    <li className="rounded-lg border border-line bg-canvas p-3">
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={{ name, color }} size={32} />
            <input
              autoFocus
              aria-label="Profile name"
              value={name}
              maxLength={MAX_PROFILE_NAME}
              onChange={(event) => { setName(event.target.value); setError(null); }}
              className={FIELD_CLASS}
            />
          </div>
          <ColorChoice value={color} onChange={setColor} name={name || 'this profile'} />
          {error && <p role="alert" className="text-sm text-overdue">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm">Save</Button>
            <Button type="button" size="sm" variant="secondary" onClick={cancelInner}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <ProfileAvatar profile={profile} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{profile.name}</p>
            {isCurrent && <p className="text-xs text-muted">You are in this profile</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label={`Rename or recolour ${profile.name}`} className="w-8 p-0 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11">
            <Pencil size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={askDelete}
            disabled={deleteDisabledReason !== null}
            title={deleteDisabledReason ?? undefined}
            aria-label={deleteDisabledReason ? `Delete ${profile.name} (not available: ${deleteDisabledReason})` : `Delete ${profile.name}`}
            className="w-8 p-0 text-overdue hover:text-overdue [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
          >
            <Trash2 size={16} aria-hidden="true" />
          </Button>
        </div>
      )}

      {confirming && (
        <div role="alertdialog" aria-label={`Delete ${profile.name}?`} className="mt-3 rounded-lg border border-overdue/40 p-3 text-sm">
          <p className="font-medium text-ink">Delete “{profile.name}”?</p>
          <p className="mt-1 text-muted">
            {taskCount === null ? 'Its tasks, lists and tags' : `Its ${taskCount} task${taskCount === 1 ? '' : 's'}, lists and tags`} will be removed from this device
            {signedIn ? ' and from your account' : ''}. This cannot be undone.
            {!signedIn && phase === 'signed-out' ? ' You are signed out, so a copy kept in your account is not removed, and the profile comes back the next time you sign in.' : ''}
          </p>
          {error && <p role="alert" className="mt-2 text-overdue">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => { void confirmDelete(); }}>{busy ? 'Deleting…' : 'Delete profile'}</Button>
            <Button variant="secondary" size="sm" disabled={busy} onClick={cancelInner}>Keep it</Button>
          </div>
        </div>
      )}
      {!confirming && !editing && error && <p role="alert" className="mt-2 text-sm text-overdue">{error}</p>}
    </li>
  );
}

function AddProfile() {
  const count = useProfileStore((state) => state.profiles.length);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PROFILE_COLORS[1].value);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Profile | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const full = count >= MAX_PROFILES;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = useProfileStore.getState().create(name, color);
    if (!result.ok || !result.profile) { setError(result.ok ? 'The profile could not be created.' : result.error); return; }
    setAdded(result.profile);
    setName('');
    setError(null);
    // Next colour in the list, so profiles made in a row look different
    const index = PROFILE_COLORS.findIndex((c) => c.value === color);
    setColor(PROFILE_COLORS[(index + 1) % PROFILE_COLORS.length].value);
  };

  return (
    <section aria-labelledby="add-profile-title" className="rounded-lg border border-line p-3">
      <h3 id="add-profile-title" className="text-sm font-semibold text-ink">Add a profile</h3>
      {full ? (
        <p className="mt-2 text-sm text-muted">You have {MAX_PROFILES} profiles, the most there can be. Delete one to add another.</p>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={{ name: name || '?', color }} size={32} />
            <input
              aria-label="New profile name"
              placeholder="Work, Family, Side project…"
              value={name}
              maxLength={MAX_PROFILE_NAME}
              onChange={(event) => { setName(event.target.value); setError(null); setAdded(null); }}
              className={FIELD_CLASS}
            />
          </div>
          <ColorChoice value={color} onChange={setColor} name="the new profile" />
          {error && <p role="alert" className="text-sm text-overdue">{error}</p>}
          <Button type="submit" size="sm"><Plus size={16} className="mr-1.5" aria-hidden="true" />Add profile</Button>
        </form>
      )}
      {added && (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink">
          <span>“{added.name}” is ready.</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void useProfileStore.getState().switchTo(added.id).then((reason) => setSwitchError(reason));
            }}
          >
            Open it now
          </Button>
          {switchError && <span role="alert" className="text-overdue">{switchError}</span>}
        </div>
      )}
    </section>
  );
}

/** Add, rename, recolour and delete profiles. Opened from the profile menu. */
export function ProfilesDialog() {
  const open = useUiStore((state) => state.profilesOpen);
  const profiles = useProfileStore((state) => state.profiles);
  const activeId = useProfileStore((state) => state.activeId);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => useUiStore.getState().setProfilesOpen(false);

  useEscapeKey(open, close, { back: true });

  // Focus goes in when it opens and back to where it was when it closes
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      // The menu item that opened this is gone by now: go back to the profile button, where the person started
      const usable = previous && previous !== document.body && document.contains(previous);
      const target = usable ? previous : document.querySelector<HTMLElement>('[data-profile-trigger]');
      target?.focus();
    };
  }, [open]);

  if (!open) return null;

  // Keep Tab inside the dialog
  const trapTab = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-0 sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profiles-title"
        onKeyDown={trapTab}
        className="flex h-full w-full max-w-lg flex-col overflow-hidden bg-canvas pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-xl sm:h-auto sm:max-h-[88vh] sm:rounded-[10px] sm:border sm:border-line sm:pt-0 sm:pb-0"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="profiles-title" className="text-lg font-semibold text-ink">Profiles</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close profiles"
            className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-ink [@media(pointer:coarse)]:p-3"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-sm text-muted">
            A profile is a separate set of lists, tasks and tags, for example Personal and Work. Theme and other settings are shared by all of them.
          </p>
          <ul className="space-y-2">
            {profiles.map((profile) => (
              <ProfileRow key={profile.id} profile={profile} isCurrent={profile.id === activeId} onlyOne={profiles.length <= 1} />
            ))}
          </ul>
          <AddProfile />
        </div>
      </div>
    </div>
  );
}
