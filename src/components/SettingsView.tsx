import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Monitor, Sun, Moon, Download, Upload, Trash2, Undo2, AlertTriangle, CheckCircle, Pencil, Plus } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { ListEditSidebar } from './ListEditSidebar.tsx';
import { AccountSection } from './AccountSection.tsx';
import { ReminderSettings } from './ReminderSettings.tsx';
import { ProfileAvatar } from './ProfileAvatar.tsx';
import { useActiveProfile, useProfileStore } from '../stores/profileStore.ts';
import { Button } from './ui/Button.tsx';
import { cn } from '../utils/cn.ts';
import { MAX_BACKUP_CHARS, backupFileName, parseBackup, type ParseResult } from '../utils/backup.ts';
import { downloadTextFile } from '../utils/download.ts';
import type { RowDensity, TaskList, ThemePreference } from '../types/index.ts';

/** A message under a section: green for done, amber for "not sure", red for failed */
type Notice = { kind: 'ok' | 'warning' | 'error'; text: string; details?: string[] };

function NoticeBox({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  const tone = notice.kind === 'ok' ? 'border-done/40' : notice.kind === 'warning' ? 'border-important/50' : 'border-overdue/40';
  const Icon = notice.kind === 'ok' ? CheckCircle : AlertTriangle;
  const color = notice.kind === 'ok' ? 'text-done' : notice.kind === 'warning' ? 'text-important' : 'text-overdue';
  return (
    <div className={cn('mt-3 flex gap-3 rounded-lg border bg-canvas p-3 text-sm', tone)} role="status">
      <Icon size={18} className={cn('mt-0.5 flex-shrink-0', color)} aria-hidden="true" />
      <div className="min-w-0 text-ink">
        <p>{notice.text}</p>
        {notice.details && notice.details.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-muted">
            {notice.details.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** A group of buttons where exactly one is chosen (theme, task rows) */
function Choice<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode; hint?: string }[];
  onChange: (value: T) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // The keyboard model of a radio group: arrows (also Home and End) move the choice and its focus together, and only
  // the chosen button is reached with Tab.
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = options.length - 1;
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    onChange(options[next].value);
    buttons.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => { buttons.current[index] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, index)}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
              selected ? 'border-accent bg-accent/10 text-ink' : 'border-line bg-canvas text-ink hover:bg-hover',
            )}
          >
            {option.icon && <span className={cn('flex-shrink-0', selected ? 'text-accent' : 'text-muted')}>{option.icon}</span>}
            <span className="min-w-0">
              <span className="block font-medium">{option.label}</span>
              {option.hint && <span className="block text-xs text-muted">{option.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: ReactNode; hint: string }[] = [
  { value: 'system', label: 'Follow device', icon: <Monitor size={18} aria-hidden="true" />, hint: 'Light or dark like your device' },
  { value: 'light', label: 'Light', icon: <Sun size={18} aria-hidden="true" />, hint: 'Always light' },
  { value: 'dark', label: 'Dark', icon: <Moon size={18} aria-hidden="true" />, hint: 'Always dark' },
];

const DENSITIES: { value: RowDensity; label: string; hint: string }[] = [
  { value: 'compact', label: 'Compact', hint: 'More tasks on screen' },
  { value: 'comfortable', label: 'Comfortable', hint: 'A little more room around each task' },
  { value: 'minimal', label: 'Minimal', hint: 'One line of details under each title, like Microsoft To Do' },
];

/** The confirmation before everything is removed. Escape or Cancel closes it; focus stays inside it. */
function RemoveAllDialog({ counts, onClose, onExport, onConfirm, busy, exported }: {
  counts: { tasks: number; lists: number; tags: number };
  onClose: () => void;
  onExport: () => void;
  onConfirm: () => void;
  busy: boolean;
  exported: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const profileName = useActiveProfile().name;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    boxRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(); // the safe choice (Cancel) has focus
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busy) onClose();
      } else if (event.key === 'Tab' && boxRef.current) {
        const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="remove-all-title" aria-describedby="remove-all-text" className="w-full max-w-lg rounded-[10px] border border-line bg-canvas p-5 shadow-xl">
        <h2 id="remove-all-title" className="text-lg font-semibold text-ink">Remove all data?</h2>
        <p id="remove-all-text" className="mt-2 text-sm text-muted">
          This removes {counts.tasks} task{counts.tasks === 1 ? '' : 's'}, {counts.lists} list{counts.lists === 1 ? '' : 's'} and {counts.tags} tag{counts.tags === 1 ? '' : 's'} of the profile
          “{profileName}” from this device, together with your settings and any copy kept for undoing an import. Your other profiles are not touched. It cannot be undone. Export a backup first if you might want it back.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button data-autofocus variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="secondary" className="whitespace-nowrap" onClick={onExport} disabled={busy}>
            <Download size={16} className="mr-2" aria-hidden="true" />
            {exported ? 'Export again' : 'Export a backup first'}
          </Button>
          <Button variant="destructive" className="whitespace-nowrap" onClick={onConfirm} disabled={busy}>
            {busy ? 'Removing…' : 'Remove everything'}
          </Button>
        </div>
        {exported && <p className="mt-3 text-sm text-done" role="status">The backup file was downloaded.</p>}
      </div>
    </div>
  );
}

/**
 * Settings: one scrolling page. Account, Profiles, Appearance (theme, row height), Reminders (notifications), Lists,
 * and Data (export, import, remove all).
 */
export function SettingsView() {
  const themePreference = useTaskStore((state) => state.themePreference);
  const rowDensity = useTaskStore((state) => state.rowDensity);
  const setThemePreference = useTaskStore((state) => state.setThemePreference);
  const setRowDensity = useTaskStore((state) => state.setRowDensity);
  const tasks = useTaskStore((state) => state.tasks);
  const lists = useTaskStore((state) => state.lists);
  const categories = useTaskStore((state) => state.categories);
  const getTaskCountForList = useTaskStore((state) => state.getTaskCountForList);
  const profile = useActiveProfile();
  const profileCount = useProfileStore((state) => state.profiles.length);

  const customLists = lists.filter((list) => !list.isSystem).sort((a, b) => a.order - b.order);
  const counts = { tasks: tasks.length, lists: customLists.length, tags: categories.length };

  // ---- Lists
  const [editingList, setEditingList] = useState<TaskList | null>(null);
  const [creatingList, setCreatingList] = useState(false);

  // ---- Data
  const [exportNotice, setExportNotice] = useState<Notice | null>(null);
  const [importNotice, setImportNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<{ fileName: string; result: Extract<ParseResult, { ok: true }> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeNotice, setRemoveNotice] = useState<Notice | null>(null);
  const [exportedForRemoval, setExportedForRemoval] = useState(false);
  const [storageVersion, setStorageVersion] = useState(0); // bumps when the "earlier copy" may have changed
  const fileInput = useRef<HTMLInputElement>(null);
  const readToken = useRef(0);

  // The earlier copy kept for undoing an import
  const canUndoImport = (void storageVersion, useTaskStore.getState().hasPreviousData());

  const exportData = (): boolean => {
    try {
      downloadTextFile(backupFileName(), useTaskStore.getState().exportBackup());
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    }
  };

  const handleExport = () => {
    setExportNotice(exportData()
      ? { kind: 'ok', text: `A backup file (${backupFileName()}) was created. Check your downloads folder.` }
      : { kind: 'error', text: 'The backup could not be created. Nothing was changed.' });
  };

  /**
   * Reads a chosen file and checks it. Nothing is changed here: the person must confirm first.
   *
   * Robustness / pitfalls guarded against:
   * - Choosing another file while one is still being read: only the latest choice counts (`readToken`).
   * - A huge file is refused by its size before it is read into memory.
   * - A file that can't be read, or isn't a backup, produces a message and leaves the current data alone.
   * - The file input is emptied so the same file can be chosen again.
   */
  const handleFileChosen = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    const token = ++readToken.current;
    setPending(null);
    setImportNotice(null);

    if (file.size > MAX_BACKUP_CHARS) {
      setImportNotice({ kind: 'error', text: 'That file is too large to be one of this app\'s backups. Nothing was changed.' });
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      if (token === readToken.current) setImportNotice({ kind: 'error', text: 'That file could not be read. Nothing was changed.' });
      return;
    }
    if (token !== readToken.current) return;

    const result = parseBackup(text);
    if (!result.ok) {
      setImportNotice({ kind: 'error', text: `${result.error} Nothing was changed.` });
      return;
    }
    setPending({ fileName: file.name, result });
  };

  /**
   * Replaces the app's data with the checked file.
   *
   * Robustness / pitfalls guarded against:
   * - Only runs after the person confirmed the preview, and only once (`busy` blocks a second click).
   * - What happened is reported as it really was: saved, NOT saved, or unknown (the browser did not confirm it).
   * - Open details, the selection and filters of the old data are dropped, because their ids may not exist any more.
   */
  const handleConfirmImport = () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const result = useTaskStore.getState().importBackup(pending.result.data);
      if (result.status === 'failed') {
        setImportNotice({ kind: 'error', text: result.reason ?? 'The import failed. Nothing was changed.' });
      } else {
        const ui = useUiStore.getState();
        ui.selectTask(null);
        ui.clearOpenTask();
        ui.setTagFilter(null);
        const s = pending.result.summary;
        const summary = `${s.tasks} task${s.tasks === 1 ? '' : 's'}, ${s.lists} list${s.lists === 1 ? '' : 's'} and ${s.categories} tag${s.categories === 1 ? '' : 's'}`;
        setImportNotice(result.status === 'ok'
          ? { kind: 'ok', text: `Imported ${summary}. Your earlier data is kept, so you can undo this below.` }
          : { kind: 'warning', text: `Imported ${summary}, but it is not certain it was saved on this device. ${result.reason ?? ''} Export a backup now, and reload the page to check.` });
      }
      setPending(null);
      setStorageVersion((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  const handleUndoImport = () => {
    if (busy) return;
    setBusy(true);
    const result = useTaskStore.getState().restorePreviousData();
    if (result.status === 'failed') {
      setImportNotice({ kind: 'error', text: result.reason ?? 'The earlier data could not be restored.' });
      setBusy(false);
      return;
    }
    // The app starts again from what is now saved
    window.location.reload();
  };

  const handleRemoveAll = () => {
    if (busy) return;
    setBusy(true);
    const result = useTaskStore.getState().removeAllData();
    if (result.status !== 'ok') {
      setBusy(false);
      setRemoveOpen(false);
      setRemoveNotice({ kind: 'error', text: `${result.reason ?? 'The data could not be removed.'} Nothing was reported as removed; try again or clear this site's data in your browser settings.` });
      return;
    }
    window.location.reload();
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-4 md:py-6">
      <Section id="settings-account" title="Account" description="Sign in to keep your tasks in sync on all your devices.">
        <AccountSection />
      </Section>

      <Section id="settings-profiles" title="Profiles" description="Keep different parts of your life apart, for example Personal and Work. Each profile has its own lists, tasks and tags; settings like the theme are shared.">
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line px-3 py-2.5">
          <ProfileAvatar profile={profile} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{profile.name}</p>
            <p className="text-xs text-muted">The profile you are in{profileCount > 1 ? ` (${profileCount} profiles)` : ''}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => useUiStore.getState().setProfilesOpen(true)}>Add or manage profiles…</Button>
        </div>
      </Section>

      <Section id="settings-appearance" title="Appearance">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-ink" id="theme-label">Theme</p>
            <Choice label="Theme" value={themePreference} options={THEMES} onChange={setThemePreference} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Task rows</p>
            <Choice label="Task rows" value={rowDensity} options={DENSITIES} onChange={setRowDensity} />
          </div>
        </div>
      </Section>

      <Section id="settings-reminders" title="Reminders" description="Get alerted at the time you set with “Remind me” on a task.">
        <ReminderSettings />
      </Section>

      <Section id="settings-lists" title="Lists" description="Your own lists. Drag lists in the sidebar to reorder them.">
        {customLists.length === 0 ? (
          <p className="text-sm text-muted">You have no lists of your own yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-[10px] border border-line">
            {customLists.map((list) => (
              <li key={list.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-6 text-center text-lg" aria-hidden="true">{list.emoji || '📋'}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{list.name}</span>
                <span className="text-xs text-muted">{getTaskCountForList(list.id)} open</span>
                <Button variant="ghost" size="sm" onClick={() => setEditingList(list)} aria-label={`Edit list ${list.name}`} className="[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 p-0 w-8">
                  <Pencil size={16} aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={() => setCreatingList(true)}>
            <Plus size={16} className="mr-2" aria-hidden="true" />
            New list
          </Button>
        </div>
      </Section>

      <Section
        id="settings-data"
        title="Data"
        description={`This is the data of your “${profile.name}” profile. It is stored on this device (and in your account when you are signed in): ${counts.tasks} task${counts.tasks === 1 ? '' : 's'}, ${counts.lists} list${counts.lists === 1 ? '' : 's'} and ${counts.tags} tag${counts.tags === 1 ? '' : 's'}. A backup file lets you move it to another device or keep a copy. Backups, imports and removing data only ever touch this profile.`}
      >
        <div className="space-y-6">
          <div>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} className="mr-2" aria-hidden="true" />
              Export a backup
            </Button>
            <NoticeBox notice={exportNotice} />
          </div>

          <div>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Choose a backup file to import"
              tabIndex={-1}
              onChange={(event) => { void handleFileChosen(event.target.files?.[0]); }}
            />
            <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
              <Upload size={16} className="mr-2" aria-hidden="true" />
              Import a backup…
            </Button>
            <p className="mt-2 text-xs text-muted">Importing replaces everything in the app with the contents of the file. You can look at it first, and undo it afterwards.</p>

            {pending && (
              <div className="mt-3 rounded-lg border border-line bg-canvas p-4 text-sm" role="group" aria-label="Import preview">
                <p className="font-medium text-ink">{pending.fileName}</p>
                <p className="mt-1 text-muted">
                  Contains {pending.result.summary.tasks} task{pending.result.summary.tasks === 1 ? '' : 's'}, {pending.result.summary.lists} list{pending.result.summary.lists === 1 ? '' : 's'},{' '}
                  {pending.result.summary.listGroups} group{pending.result.summary.listGroups === 1 ? '' : 's'} and {pending.result.summary.categories} tag{pending.result.summary.categories === 1 ? '' : 's'}
                  {pending.result.exportedAt && !Number.isNaN(new Date(pending.result.exportedAt).getTime()) ? `, exported ${new Date(pending.result.exportedAt).toLocaleString('en-US')}` : ''}.
                </p>
                <p className="mt-2 text-ink">
                  This will replace your current {counts.tasks} task{counts.tasks === 1 ? '' : 's'}, {counts.lists} list{counts.lists === 1 ? '' : 's'} and {counts.tags} tag{counts.tags === 1 ? '' : 's'}.
                </p>
                {pending.result.warnings.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-muted">
                    {pending.result.warnings.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="destructive" size="sm" onClick={handleConfirmImport} disabled={busy}>Replace my data</Button>
                  <Button variant="secondary" size="sm" onClick={() => setPending(null)} disabled={busy}>Cancel</Button>
                </div>
              </div>
            )}
            <NoticeBox notice={importNotice} />

            {canUndoImport && (
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={handleUndoImport} disabled={busy}>
                  <Undo2 size={16} className="mr-2" aria-hidden="true" />
                  Undo the last import
                </Button>
                <p className="mt-1 text-xs text-muted">Goes back to the data you had just before the last import. The page reloads.</p>
              </div>
            )}
          </div>

          <div className="rounded-[10px] border border-overdue/30 p-4">
            <h4 className="text-sm font-medium text-ink">Remove all data</h4>
            <p className="mt-1 text-sm text-muted">Deletes every task, list and tag of the “{profile.name}” profile, and your settings, from this device. Your other profiles are not touched. You will be asked to confirm.</p>
            <Button variant="destructive" size="sm" className="mt-3" onClick={() => { setRemoveNotice(null); setExportedForRemoval(false); setRemoveOpen(true); }}>
              <Trash2 size={16} className="mr-2" aria-hidden="true" />
              Remove all data…
            </Button>
            <NoticeBox notice={removeNotice} />
          </div>
        </div>
      </Section>

      {editingList && <ListEditSidebar list={editingList} isOpen mode="edit" onClose={() => setEditingList(null)} />}
      <ListEditSidebar isOpen={creatingList} mode="create" onClose={() => setCreatingList(false)} />

      {removeOpen && (
        <RemoveAllDialog
          counts={counts}
          busy={busy}
          exported={exportedForRemoval}
          onClose={() => setRemoveOpen(false)}
          onExport={() => setExportedForRemoval(exportData())}
          onConfirm={handleRemoveAll}
        />
      )}
      <div className="h-8" aria-hidden="true" />
    </div>
  );
}
