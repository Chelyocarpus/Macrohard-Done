import type { AppState } from '../types/index.ts';

const STORAGE_KEY = 'todo-clone-data';

export function saveToStorage(data: AppState): void {
  try {
    const serializedData = JSON.stringify(data, (_, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });
    localStorage.setItem(STORAGE_KEY, serializedData);
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function loadFromStorage(): Partial<AppState> | null {
  try {
    const serializedData = localStorage.getItem(STORAGE_KEY);
    if (!serializedData) return null;
    
    return JSON.parse(serializedData, (_, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
