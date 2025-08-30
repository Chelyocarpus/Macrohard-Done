import { useRef, useEffect, useState, useCallback } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  enabled?: boolean;
  debounceMs?: number;
  showSavedDuration?: number;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  triggerSave: () => void;
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
    showSavedDuration = 2000
  } = options;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timeoutRef = useRef<number | null>(null);
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
        return JSON.stringify(currentValue.sort()) !== JSON.stringify(originalValue.sort());
      }

      // Handle basic value comparison
      return currentValue !== originalValue;
    });
  }, []);

  // Validate values before saving
  const isValid = useCallback(() => {
    const current = valuesRef.current;
    
    // Don't save if title is empty or only whitespace
    if (current.title !== undefined && typeof current.title === 'string' && (!current.title || !current.title.trim())) {
      return false;
    }

    // Add other validation rules as needed
    return true;
  }, []);

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

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!enabled || !hasChanges() || !isValid()) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = window.setTimeout(() => {
      triggerSave();
    }, debounceMs);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, hasChanges, isValid, triggerSave, debounceMs]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    triggerSave,
    resetSaveStatus
  };
}
