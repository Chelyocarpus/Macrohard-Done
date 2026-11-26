/** The parts of the app's data the sync snapshot contains (everything except device settings) */
interface SyncedData {
  tasks: readonly unknown[];
  categories: readonly unknown[];
  listGroups: readonly unknown[];
  lists: readonly { isSystem?: boolean }[];
  customTimePresets: readonly unknown[];
  disabledBuiltInPresets: readonly unknown[];
}

/**
 * True when this device holds nothing the cloud snapshot would replace, so the cloud copy can be taken without asking
 * and without a safety copy.
 *
 * Robustness / pitfalls guarded against:
 * - Every kind of data the snapshot carries is counted: tasks, tags, groups, custom lists, custom time presets and
 *   hidden built-in presets. A device with only presets is NOT empty; counting it as empty would overwrite them
 *   without a conflict question and without an undo copy.
 * - The built-in lists are ignored: every device has them.
 */
export function isLocalEmpty(data: SyncedData): boolean {
  return data.tasks.length === 0
    && data.categories.length === 0
    && data.listGroups.length === 0
    && data.lists.every((list) => list.isSystem)
    && data.customTimePresets.length === 0
    && data.disabledBuiltInPresets.length === 0;
}
