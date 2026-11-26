import { useRef, useEffect, useState, useCallback } from 'react';
import { createWriteScheduler, type WriteScheduler } from '../utils/writeScheduler.ts';

/** The longest a change waits to be saved while someone keeps typing without a pause */
const MAX_WAIT_MS = 5000;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  enabled?: boolean;
  debounceMs?: number;
  showSavedDuration?: number;
  customValidator?: (values: Record<string, unknown>) => boolean;
  /** Identifies the item being edited. When it changes, a save still waiting is written for the item that is being left. */
  resetKey?: string;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  triggerSave: () => void;
  /** Forgets a save that is still waiting (call after saving the same values yourself) */
  cancelPendingSave: () => void;
  resetSaveStatus: () => void;
}

/**
 * Custom hook for automatic saving with debouncing and status tracking
 */
export function useAutoSave(
  saveFunction: () => Promise<void> | void,
  values: Record<string, unknown>,
  originalValues: Record<string, unknown>,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const {
    enabled = true,
    debounceMs = 500,
    showSavedDuration = 2000,
    customValidator,
    resetKey
  } = options;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const savedTimeoutRef = useRef<number | null>(null);
  const valuesRef = useRef(values);
  const originalValuesRef = useRef(originalValues);

  // Update refs when values change
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    originalValuesRef.current = originalValues;
  }, [originalValues]);

  // Check if values have actually changed
  const hasChanges = useCallback(() => {
    const current = valuesRef.current;
    const original = originalValuesRef.current;

    // Deep comparison of values
    return Object.keys(current).some(key => {
      const currentValue = current[key];
      const originalValue = original[key];

      // Handle Date objects
      if (currentValue instanceof Date && originalValue instanceof Date) {
        return currentValue.getTime() !== originalValue.getTime();
      }

      // Handle null/undefined differences
      if ((currentValue == null) !== (originalValue == null)) {
        return true;
      }

      // Handle arrays (for repeatDays)
      if (Array.isArray(currentValue) && Array.isArray(originalValue)) {
        return JSON.stringify([...currentValue].sort()) !== JSON.stringify([...originalValue].sort());
      }

      // Handle basic value comparison
      return currentValue !== originalValue;
    });
  }, []);

  // Validate values before saving
  const isValid = useCallback(() => {
    const current = valuesRef.current;
    
    // Use custom validator if provided
    if (customValidator) {
      return customValidator(current);
    }
    
    // Default validation: Don't save if title field exists and is empty/whitespace
    // This preserves backward compatibility while being more flexible
    if (current.title !== undefined && typeof current.title === 'string' && (!current.title || !current.title.trim())) {
      return false;
    }

    // Allow forms without a title field to be saved by default
    return true;
  }, [customValidator]);

  // Trigger save function
  const triggerSave = useCallback(async () => {
    if (!enabled || !hasChanges() || !isValid()) {
      return;
    }

    setSaveStatus('saving');

    try {
      await saveFunction();
      setSaveStatus('saved');

      // Reset to idle after showing saved status
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('idle');
      }, showSavedDuration);

    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('error');

      // Reset to idle after showing error status
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('idle');
      }, showSavedDuration);
    }
  }, [enabled, hasChanges, isValid, saveFunction, showSavedDuration]);

  // Reset save status
  const resetSaveStatus = useCallback(() => {
    setSaveStatus('idle');
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = null;
    }
  }, []);

  // The newest save, for the scheduler (made once) and for the flush when the form goes away.
  // Refs are updated in an effect, which runs AFTER the cleanups of the same render: so a cleanup that
  // flushes still sees the closure (task id and values) of the form that is being left.
  const triggerSaveRef = useRef(triggerSave);
  useEffect(() => {
    triggerSaveRef.current = triggerSave;
  }, [triggerSave]);

  // Debounce, cancel and flush in one tested piece (utils/writeScheduler.ts). The cap keeps typing without a pause
  // from postponing the save forever, so a crash or a killed tab loses at most a few seconds.
  const schedulerRef = useRef<WriteScheduler | null>(null);
  if (schedulerRef.current === null) {
    schedulerRef.current = createWriteScheduler(() => { void triggerSaveRef.current(); }, debounceMs, MAX_WAIT_MS);
  }

  // Auto-save effect with debouncing: every change moves the save back, an unchanged or invalid form saves nothing
  useEffect(() => {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;
    if (!enabled || !hasChanges() || !isValid()) {
      scheduler.cancel();
      return;
    }
    scheduler.schedule();
  }, [enabled, hasChanges, isValid, triggerSave]);

  // When the form is closed, switched to another item (`resetKey` changes) or removed, a change typed within the
  // last moment is saved right away instead of being thrown away with the timer.
  useEffect(() => {
    const scheduler = schedulerRef.current;
    return () => scheduler?.flush();
  }, [enabled, resetKey]);

  // Cleanup the "saved" message timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  // Drop a waiting save, for a caller that has just saved the same values itself
  const cancelPendingSave = useCallback(() => {
    schedulerRef.current?.cancel();
  }, []);

  return {
    saveStatus,
    triggerSave,
    cancelPendingSave,
    resetSaveStatus
  };
}
