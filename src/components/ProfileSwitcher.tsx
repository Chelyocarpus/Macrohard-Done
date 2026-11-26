import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Settings2 } from 'lucide-react';
import { Tooltip } from './ui/Tooltip.tsx';
import { ProfileAvatar } from './ProfileAvatar.tsx';
import { cn } from '../utils/cn.ts';
import { useEscapeKey } from '../hooks/useEscapeKey.ts';
import { useActiveProfile, useProfileStore } from '../stores/profileStore.ts';
import { useUiStore } from '../stores/uiStore.ts';

type Variant = 'sidebar' | 'rail';

interface Anchor { top: number; left: number; maxHeight: number }

const MENU_WIDTH = 264;

/** What a profile is, in the words a first-time user needs (the Profiles dialog says the same at more length) */
const PROFILE_EXPLANATION = 'A profile is a separate set of lists and tasks, for example Personal and Work. Pick one to switch, or add another.';
const EDGE = 8;

/** Where the menu goes, relative to its button, kept inside the window */
function placeMenu(rect: DOMRect, variant: Variant): Anchor {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (variant === 'rail') {
    return { top: Math.max(EDGE, rect.top), left: rect.right + EDGE, maxHeight: vh - Math.max(EDGE, rect.top) - EDGE };
  }
  const top = rect.bottom + 6;
  return { top, left: Math.min(Math.max(EDGE, rect.left), Math.max(EDGE, vw - MENU_WIDTH - EDGE)), maxHeight: vh - top - EDGE };
}

/**
 * The profile the person is in, always shown, and the way to change it. One component in two sizes:
 * - `sidebar`: a full-width tinted card with the profile's name (labelled sidebar)
 * - `rail`: the round badge (icon-only sidebar); the name is in its tooltip and accessible name
 * Opens a menu of all profiles. Choosing one reloads the app in that profile.
 */
export function ProfileSwitcher({ variant, className }: { variant: Variant; className?: string }) {
  const active = useActiveProfile();
  const profiles = useProfileStore((state) => state.profiles);
  const busy = useProfileStore((state) => state.busy);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    setProblem(null);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  useEscapeKey(open, () => close());

  // Position when it opens (and keep it inside the window if that changes: closing on resize is simplest and safest)
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    setAnchor(placeMenu(buttonRef.current.getBoundingClientRect(), variant));
  }, [open, variant]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && (menuRef.current?.contains(target) || buttonRef.current?.contains(target))) return;
      close(false);
    };
    const onResize = () => close(false);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  // The current profile gets the focus, so Enter again closes and the arrow keys start from where the person is
  useEffect(() => {
    if (!open || !anchor) return;
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[data-menu-item]');
    const current = menuRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    (current ?? items?.[0])?.focus();
  }, [open, anchor]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? []);
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = (index + 1) % items.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else if (event.key === 'Tab') { close(); return; }
    if (next >= 0) {
      event.preventDefault();
      items[next].focus();
    }
  };

  const choose = async (id: string) => {
    if (id === active.id) { close(); return; }
    setProblem(null);
    const reason = await useProfileStore.getState().switchTo(id);
    if (reason) setProblem(reason); // on success the page reloads
  };

  const manage = () => {
    close(false);
    useUiStore.getState().setProfilesOpen(true);
  };

  const label = `Profile: ${active.name}. Change profile`;
  // With a single profile there is nothing to tell apart yet, so the card stays plain instead of being the loudest
  // thing in the sidebar; a second profile gives each one its colour.
  const several = profiles.length > 1;
  const trigger = (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => (open ? close() : setOpen(true))}
      aria-label={variant === 'rail' ? label : undefined}
      aria-haspopup="true"
      aria-expanded={open}
      data-profile-trigger=""
      title={variant === 'sidebar' ? PROFILE_EXPLANATION : undefined}
      className={cn(
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        variant === 'sidebar' && 'flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left',
        variant === 'sidebar' && (several ? 'hover:brightness-95 dark:hover:brightness-110' : 'border-line hover:bg-hover'),
        variant === 'rail' && 'relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-hover',
        className,
      )}
      style={
        variant === 'rail' || !several
          ? undefined
          : { backgroundColor: `${active.color}1f`, borderColor: `${active.color}66` }
      }
    >
      {variant === 'sidebar' && (
        <>
          <ProfileAvatar profile={active} size={30} />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.6875rem] font-medium uppercase leading-tight tracking-wide text-muted">Profile</span>
            <span className="block truncate text-sm font-semibold leading-tight text-ink">{active.name}</span>
          </span>
          <ChevronDown size={16} className="flex-shrink-0 text-muted" aria-hidden="true" />
        </>
      )}
      {variant === 'rail' && (
        <span className="rounded-full p-[2px]" style={{ boxShadow: `0 0 0 2px ${active.color}` }}>
          <ProfileAvatar profile={active} size={24} />
        </span>
      )}
    </button>
  );

  return (
    <>
      {variant === 'rail' ? (
        <Tooltip label={`Profile: ${active.name}`} side="right" className="relative w-full justify-center">{trigger}</Tooltip>
      ) : trigger}

      {open && anchor && createPortal(
        <div
          ref={menuRef}
          role="group"
          aria-label="Profiles"
          onKeyDown={onMenuKeyDown}
          className="fixed z-[70] overflow-y-auto rounded-xl border border-line bg-canvas p-1.5 shadow-xl"
          style={{ top: anchor.top, left: anchor.left, width: `min(${MENU_WIDTH}px, calc(100vw - ${EDGE * 2}px))`, maxHeight: anchor.maxHeight }}
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">Switch profile</p>
          <p className="px-2.5 pb-2 text-xs text-muted">{PROFILE_EXPLANATION}</p>
          <ul className="space-y-0.5">
            {profiles.map((profile) => {
              const isActive = profile.id === active.id;
              return (
                <li key={profile.id}>
                  <button
                    type="button"
                    data-menu-item
                    disabled={busy}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => { void choose(profile.id); }}
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-ink transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none disabled:opacity-60 [@media(pointer:coarse)]:min-h-11"
                  >
                    <ProfileAvatar profile={profile} size={26} />
                    <span className={cn('min-w-0 flex-1 truncate', isActive && 'font-semibold')}>{profile.name}</span>
                    {isActive && <><Check size={16} className="flex-shrink-0 text-accent" aria-hidden="true" /><span className="sr-only">(current)</span></>}
                  </button>
                </li>
              );
            })}
          </ul>
          {problem && <p role="alert" className="px-2.5 py-2 text-xs text-overdue">{problem}</p>}
          <div className="my-1.5 h-px bg-line" aria-hidden="true" />
          <button
            type="button"
            data-menu-item
            onClick={manage}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-ink transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none [@media(pointer:coarse)]:min-h-11"
          >
            <Settings2 size={18} className="flex-shrink-0 text-muted" aria-hidden="true" />
            <span>Add or manage profiles…</span>
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
