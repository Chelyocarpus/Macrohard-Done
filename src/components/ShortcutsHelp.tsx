import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useUiStore } from '../stores/uiStore.ts';
import { HOTKEY_HELP, formatHotkey } from '../utils/hotkeys.ts';
import { isApplePlatform } from '../utils/platform.ts';
import { focusTaskRowSoon } from '../utils/taskDom.ts';
import { useEscapeKey } from '../hooks/useEscapeKey.ts';

const GROUPS = ['Tasks', 'Move around', 'App'] as const;

/** The "?" list of keyboard shortcuts. Closes with Escape, the X button or a click outside. */
export function ShortcutsHelp() {
  const open = useUiStore((state) => state.helpOpen);
  const setOpen = useUiStore((state) => state.setHelpOpen);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEscapeKey(open, () => setOpen(false), { back: true });

  // Focus goes into the dialog when it opens and back to where it was when it closes
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        // Only one control to tab to, so keep focus on it instead of leaking behind the dialog
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous && document.contains(previous)) previous.focus();
      else {
        // The row that had focus was redrawn meanwhile: go back to the selected one
        const selected = useUiStore.getState().selectedTaskId;
        if (selected) focusTaskRowSoon(selected);
      }
    };
  }, [open, setOpen]);

  if (!open) return null;
  const apple = isApplePlatform();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[10px] border border-line bg-canvas shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-ink">Keyboard shortcuts</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close keyboard shortcuts"
            className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-5">
          {GROUPS.map((group) => (
            <section key={group} aria-label={group}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{group}</h3>
              <ul className="divide-y divide-line">
                {HOTKEY_HELP.filter((entry) => entry.group === group).map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                    <span className="text-ink">{entry.label}</span>
                    <span className="flex flex-shrink-0 items-center gap-1.5">
                      {entry.keys.map((keys, index) => (
                        <span key={index} className="flex items-center gap-1.5">
                          {index > 0 && <span className="text-xs text-muted">or</span>}
                          <kbd className="rounded-md border border-line bg-sidebar px-2 py-0.5 font-sans text-xs text-ink">
                            {formatHotkey(keys, apple)}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-xs text-muted">
            Select a task by clicking it or with the arrow keys. Shortcuts are switched off while you type in a field.
          </p>
        </div>
      </div>
    </div>
  );
}
