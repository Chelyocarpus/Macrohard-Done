import { beforeEach, describe, expect, it } from 'vitest';
import { toastBottom } from '../../utils/layout.ts';
import { useUiStore } from '../../stores/uiStore.ts';

describe('toastBottom', () => {
  it('sits above the "Add a task" button when no bottom sheet is open', () => {
    expect(toastBottom(0)).toBe('calc(max(1rem, env(safe-area-inset-bottom)) + 4.5rem)');
  });

  it('sits above the sheet footer (plus the device inset and a little space) when one is open', () => {
    expect(toastBottom(150)).toBe('calc(env(safe-area-inset-bottom, 0px) + 150px + 0.75rem)');
  });

  it('ignores a height that makes no sense', () => {
    expect(toastBottom(-20)).toBe(toastBottom(0));
    expect(toastBottom(Number.NaN)).toBe(toastBottom(0));
  });
});

describe('sheet footer height in the UI store', () => {
  beforeEach(() => useUiStore.setState({ bottomSheetFooterHeight: 0 }));

  it('stores a whole, positive height', () => {
    useUiStore.getState().setBottomSheetFooterHeight(149.6);
    expect(useUiStore.getState().bottomSheetFooterHeight).toBe(150);
  });

  it('turns a bad or zero height into 0, so the messages go back to their normal place', () => {
    useUiStore.getState().setBottomSheetFooterHeight(150);
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      useUiStore.getState().setBottomSheetFooterHeight(150);
      useUiStore.getState().setBottomSheetFooterHeight(bad);
      expect(useUiStore.getState().bottomSheetFooterHeight).toBe(0);
    }
  });
});
