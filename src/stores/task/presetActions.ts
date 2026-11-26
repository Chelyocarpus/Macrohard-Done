import type { TimePreset } from '../../types/index.ts';
import { generateId } from '../../utils/storage.ts';
import type { StoreContext, TaskStore } from './types.ts';

/** Custom and built-in time presets for the date picker. */
export const createPresetActions = ({ set, saveState }: StoreContext): Pick<TaskStore, 'addCustomTimePreset' | 'removeCustomTimePreset' | 'removeBuiltInPreset' | 'restoreBuiltInPreset'> => ({
  addCustomTimePreset: (label: string, hour: number, minute: number) => {
    const newPreset: TimePreset = {
      id: generateId(),
      label,
      hour,
      minute,
      isCustom: true,
      createdAt: new Date(),
    };

    set((state) => ({
      customTimePresets: [...state.customTimePresets, newPreset],
    }));
    saveState();
  },

  removeCustomTimePreset: (id: string) => {
    set((state) => ({
      customTimePresets: state.customTimePresets.filter(preset => preset.id !== id),
    }));
    saveState();
  },

  removeBuiltInPreset: (id: string) => {
    set((state) => ({
      disabledBuiltInPresets: [...state.disabledBuiltInPresets, id],
    }));
    saveState();
  },

  restoreBuiltInPreset: (id: string) => {
    set((state) => ({
      disabledBuiltInPresets: state.disabledBuiltInPresets.filter(presetId => presetId !== id),
    }));
    saveState();
  },
});
