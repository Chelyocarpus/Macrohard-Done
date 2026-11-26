import { describe, expect, it } from 'vitest';
import { formatHotkey, HOTKEY_HELP, resolveHotkey, type HotkeyContext, type KeyInfo } from './hotkeys.ts';

const key = (k: string, extra: Partial<KeyInfo> = {}): KeyInfo => ({
  key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, repeat: false, ...extra,
});
const onPage: HotkeyContext = { typing: false, zone: 'body', modalOpen: false };
const onRow: HotkeyContext = { typing: false, zone: 'task', modalOpen: false };
const onButton: HotkeyContext = { typing: false, zone: 'button', modalOpen: false };
const onOther: HotkeyContext = { typing: false, zone: 'other', modalOpen: false };
const typing: HotkeyContext = { typing: true, zone: 'other', modalOpen: false };

describe('selecting several tasks', () => {
  it('extends the selection with Shift+Down / Shift+Up, also while held down', () => {
    expect(resolveHotkey(key('ArrowDown', { shiftKey: true }), onRow)).toBe('extend-next');
    expect(resolveHotkey(key('ArrowUp', { shiftKey: true }), onRow)).toBe('extend-previous');
    expect(resolveHotkey(key('ArrowDown', { shiftKey: true }), onPage)).toBe('extend-next');
    expect(resolveHotkey(key('ArrowDown', { shiftKey: true, repeat: true }), onRow)).toBe('extend-next');
  });
  it('leaves Shift+arrow to controls that use it and to text fields', () => {
    expect(resolveHotkey(key('ArrowDown', { shiftKey: true }), onOther)).toBeNull();
    expect(resolveHotkey(key('ArrowDown', { shiftKey: true }), typing)).toBeNull();
    expect(resolveHotkey(key('ArrowDown', { shiftKey: true }), { ...onRow, modalOpen: true })).toBeNull();
  });
  it('ticks the current task with X and clears with Escape, but not while typing or held down', () => {
    expect(resolveHotkey(key('x'), onRow)).toBe('toggle-check');
    expect(resolveHotkey(key('X'), onRow)).toBe('toggle-check');
    expect(resolveHotkey(key('x'), typing)).toBeNull();
    expect(resolveHotkey(key('x', { repeat: true }), onRow)).toBeNull();
    expect(resolveHotkey(key('Escape'), onRow)).toBe('clear-selection');
    expect(resolveHotkey(key('Escape'), typing)).toBeNull();
    expect(resolveHotkey(key('Escape'), { ...onRow, modalOpen: true })).toBeNull();
  });
  it('selects all with Ctrl/Cmd+A only from a task row, so the page text can still be selected elsewhere', () => {
    expect(resolveHotkey(key('a', { ctrlKey: true }), onRow)).toBe('select-all');
    expect(resolveHotkey(key('a', { metaKey: true }), onRow)).toBe('select-all');
    expect(resolveHotkey(key('A', { ctrlKey: true }), onRow)).toBe('select-all');
    expect(resolveHotkey(key('a', { ctrlKey: true }), onPage)).toBeNull();
    expect(resolveHotkey(key('a', { ctrlKey: true }), onButton)).toBeNull();
    expect(resolveHotkey(key('a', { ctrlKey: true }), typing)).toBeNull();
    expect(resolveHotkey(key('a', { ctrlKey: true, shiftKey: true }), onRow)).toBeNull();
  });
  it('lists the new shortcuts in the help', () => {
    const ids = HOTKEY_HELP.map((entry) => entry.id);
    for (const id of ['toggle-check', 'extend-next', 'extend-previous', 'select-all', 'clear-selection']) expect(ids).toContain(id);
  });
});

describe('resolveHotkey', () => {
  it('maps the plain keys of the spec', () => {
    expect(resolveHotkey(key('n'), onPage)).toBe('new-task');
    expect(resolveHotkey(key('f'), onPage)).toBe('search');
    expect(resolveHotkey(key('/'), onPage)).toBeNull(); // no longer the search key
    expect(resolveHotkey(key(' '), onRow)).toBe('complete');
    expect(resolveHotkey(key('s'), onPage)).toBe('important');
    expect(resolveHotkey(key('p'), onPage)).toBe('pin');
    expect(resolveHotkey(key('P'), onPage)).toBe('pin');
    expect(resolveHotkey(key('m'), onPage)).toBe('my-day');
    expect(resolveHotkey(key('d'), onPage)).toBe('due-date');
    expect(resolveHotkey(key('r'), onPage)).toBe('reminder');
    expect(resolveHotkey(key('Enter'), onRow)).toBe('open');
    expect(resolveHotkey(key('Delete'), onPage)).toBe('delete');
    expect(resolveHotkey(key('?', { shiftKey: true }), onPage)).toBe('help');
    expect(resolveHotkey(key('?'), onPage)).toBe('help');
    expect(resolveHotkey(key('/', { shiftKey: true }), onPage)).toBe('help'); // layouts that report Shift+/
  });

  it('goes to a view with 1 to 4, in the sidebar\'s order', () => {
    expect(resolveHotkey(key('1'), onPage)).toBe('go-my-day');
    expect(resolveHotkey(key('2'), onPage)).toBe('go-important');
    expect(resolveHotkey(key('3'), onPage)).toBe('go-planned');
    expect(resolveHotkey(key('4'), onPage)).toBe('go-tasks');
    expect(resolveHotkey(key('1'), onRow)).toBe('go-my-day');
    expect(resolveHotkey(key('3'), onButton)).toBe('go-planned'); // right after clicking in the sidebar
    expect(resolveHotkey(key('5'), onPage)).toBeNull();
    expect(resolveHotkey(key('0'), onPage)).toBeNull();
  });

  it('leaves the digits to text fields, controls that use them, dialogs, browser shortcuts and key repeat', () => {
    expect(resolveHotkey(key('1'), typing)).toBeNull();
    expect(resolveHotkey(key('2'), onOther)).toBe('go-important'); // arrow-key controls only hold back the arrows, Space and Enter
    expect(resolveHotkey(key('1'), { ...onPage, modalOpen: true })).toBeNull();
    expect(resolveHotkey(key('1', { ctrlKey: true }), onPage)).toBeNull(); // Ctrl+1 switches browser tabs
    expect(resolveHotkey(key('1', { altKey: true }), onPage)).toBeNull();
    expect(resolveHotkey(key('1', { metaKey: true }), onPage)).toBeNull();
    expect(resolveHotkey(key('1', { repeat: true }), onPage)).toBeNull();
  });

  it('maps the modifier combinations', () => {
    expect(resolveHotkey(key('f', { ctrlKey: true }), onPage)).toBe('search');
    expect(resolveHotkey(key('f', { metaKey: true }), onPage)).toBe('search');
    expect(resolveHotkey(key('z', { ctrlKey: true }), onPage)).toBe('undo');
    expect(resolveHotkey(key('M', { ctrlKey: true, shiftKey: true }), onPage)).toBe('move-to-list');
    expect(resolveHotkey(key('ArrowUp', { altKey: true }), onRow)).toBe('move-up');
    expect(resolveHotkey(key('ArrowDown', { altKey: true }), onRow)).toBe('move-down');
    expect(resolveHotkey(key('ArrowDown'), onRow)).toBe('select-next');
    expect(resolveHotkey(key('ArrowUp'), onRow)).toBe('select-previous');
  });

  it('is not fooled by Caps Lock', () => {
    expect(resolveHotkey(key('N'), onPage)).toBe('new-task');
    expect(resolveHotkey(key('S'), onPage)).toBe('important');
  });

  describe('typing', () => {
    it('never turns letters or Space into actions inside a text field', () => {
      for (const k of ['n', 's', 'm', 'p', 'd', 'r', 'f', '/', ' ', 'Enter', 'Delete', 'ArrowUp', 'ArrowDown', '?', '1', '2', '3', '4']) {
        expect(resolveHotkey(key(k), typing)).toBeNull();
      }
    });
    it('leaves Ctrl+Z (the field\'s own undo) and Alt+arrows to the field', () => {
      expect(resolveHotkey(key('z', { ctrlKey: true }), typing)).toBeNull();
      expect(resolveHotkey(key('ArrowUp', { altKey: true }), typing)).toBeNull();
    });
    it('still opens search with Ctrl/Cmd+F', () => {
      expect(resolveHotkey(key('f', { ctrlKey: true }), typing)).toBe('search');
    });
  });

  describe('dialogs and menus', () => {
    it('does nothing underneath an open dialog or menu', () => {
      const open: HotkeyContext = { ...onPage, modalOpen: true };
      for (const e of [key('n'), key(' '), key('Delete'), key('f', { ctrlKey: true }), key('z', { ctrlKey: true })]) {
        expect(resolveHotkey(e, open)).toBeNull();
      }
    });
  });

  describe('native behaviour of focused controls', () => {
    it('leaves Space and Enter to a focused button or link', () => {
      for (const k of [' ', 'Enter']) {
        expect(resolveHotkey(key(k), onButton)).toBeNull();
      }
    });
    it('still moves the selection with the arrow keys from a plain button (e.g. after clicking a list)', () => {
      expect(resolveHotkey(key('ArrowDown'), onButton)).toBe('select-next');
      expect(resolveHotkey(key('ArrowUp', { altKey: true }), onButton)).toBe('move-up');
    });
    it('leaves everything to controls that use the arrow keys themselves (radio, slider, tabs...)', () => {
      for (const k of [' ', 'Enter', 'ArrowUp', 'ArrowDown']) {
        expect(resolveHotkey(key(k), onOther)).toBeNull();
      }
      expect(resolveHotkey(key('ArrowUp', { altKey: true }), onOther)).toBeNull();
    });
    it('still lets letter keys act from a focused control', () => {
      expect(resolveHotkey(key('s'), onButton)).toBe('important');
    });
  });

  describe('browser and system shortcuts', () => {
    it('does not capture Ctrl/Cmd combinations other than its own', () => {
      for (const k of ['n', 's', 'd', 'r', 'm', 'a', 'c', 'v']) {
        // (Ctrl+A is the exception from a task row: see 'selecting several tasks')
        expect(resolveHotkey(key(k, { ctrlKey: true }), onPage)).toBeNull();
        expect(resolveHotkey(key(k, { metaKey: true }), onPage)).toBeNull();
      }
    });
    it('does not capture Alt+letter or Shift+letter', () => {
      expect(resolveHotkey(key('n', { altKey: true }), onPage)).toBeNull();
      expect(resolveHotkey(key('N', { shiftKey: true }), onPage)).toBeNull();
    });
    it('does not treat Ctrl+Shift+Z (redo) as undo', () => {
      expect(resolveHotkey(key('z', { ctrlKey: true, shiftKey: true }), onPage)).toBeNull();
    });
    it('ignores Ctrl+Alt (AltGr) combinations', () => {
      expect(resolveHotkey(key('ArrowUp', { ctrlKey: true, altKey: true }), onRow)).toBeNull();
    });
  });

  describe('key repeat', () => {
    it('ignores repeats of toggling and destructive actions', () => {
      for (const k of ['s', 'm', ' ', 'Delete', 'Enter', 'n']) {
        expect(resolveHotkey(key(k, { repeat: true }), onRow)).toBeNull();
      }
      expect(resolveHotkey(key('z', { ctrlKey: true, repeat: true }), onPage)).toBeNull();
    });
    it('repeats navigation and moving', () => {
      expect(resolveHotkey(key('ArrowDown', { repeat: true }), onRow)).toBe('select-next');
      expect(resolveHotkey(key('ArrowUp', { altKey: true, repeat: true }), onRow)).toBe('move-up');
    });
  });
});

describe('help list', () => {
  it('lists every action once', () => {
    const ids = HOTKEY_HELP.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([
      'new-task', 'search', 'complete', 'important', 'pin', 'my-day', 'due-date', 'reminder', 'open', 'delete',
      'move-up', 'move-down', 'move-to-list', 'undo', 'select-next', 'select-previous', 'help',
      'go-my-day', 'go-important', 'go-planned', 'go-tasks',
    ]));
  });

  it('formats keys for each platform', () => {
    expect(formatHotkey(['Mod', 'F'], false)).toBe('Ctrl+F');
    expect(formatHotkey(['Mod', 'F'], true)).toBe('⌘F');
    expect(formatHotkey(['Mod', 'Shift', 'M'], false)).toBe('Ctrl+Shift+M');
    expect(formatHotkey(['Mod', 'Shift', 'M'], true)).toBe('⌘⇧M');
    expect(formatHotkey(['Alt', 'Up'], false)).toBe('Alt+↑');
    expect(formatHotkey(['Alt', 'Up'], true)).toBe('⌥↑');
    expect(formatHotkey(['N'], false)).toBe('N');
  });
});
