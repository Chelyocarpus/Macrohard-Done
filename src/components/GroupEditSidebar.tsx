import { useState, useEffect, useCallback } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey.ts';
import { ChevronDown, Trash2 } from 'lucide-react';
import type { ListGroup } from '../types/index.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { useShallow } from 'zustand/react/shallow';
import { Button } from './ui/Button.tsx';
import { SidePanel } from './ui/SidePanel.tsx';
import { EmojiNameField } from './EmojiNameField.tsx';
import { IconOverrideControl } from './ui/IconOverrideControl.tsx';
import { AutoSaveIndicator } from './ui/AutoSaveIndicator.tsx';
import { useAutoSave } from '../hooks/useAutoSave.ts';

interface GroupEditSidebarProps {
  group?: ListGroup;
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
}

export function GroupEditSidebar({ group, isOpen, onClose, mode }: GroupEditSidebarProps) {
  // Selected: only what is used here. `lists` is listed too because the getters below read it; without it a change would not re-render.
  const { addGroup, updateGroup, deleteGroup, getListsInGroup } = useTaskStore(useShallow((state) => ({ addGroup: state.addGroup, updateGroup: state.updateGroup, deleteGroup: state.deleteGroup, getListsInGroup: state.getListsInGroup, lists: state.lists })));

  const {
    name: groupName = '',
    emoji: groupEmoji = '',
    overrideListIcons: groupOverrideListIcons = false,
  } = group || {};

  const [name, setName] = useState(groupName);
  const [emoji, setEmoji] = useState(groupEmoji);
  const [overrideListIcons, setOverrideListIcons] = useState(groupOverrideListIcons);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Lists in this group, for the preview
  const groupLists = group ? getListsInGroup(group.id) : [];

  // Auto-save setup for edit mode
  const autoSaveFunction = useCallback(() => {
    if (mode === 'edit' && group && name.trim()) {
      updateGroup(group.id, { name: name.trim(), emoji, overrideListIcons });
    }
  }, [mode, group, updateGroup, name, emoji, overrideListIcons]);

  const currentValues = { name: name.trim(), emoji, overrideListIcons };
  const originalValues = { name: groupName, emoji: groupEmoji, overrideListIcons: groupOverrideListIcons };

  // Auto-save hook - only enabled in edit mode
  const { saveStatus } = useAutoSave(
    autoSaveFunction,
    currentValues,
    originalValues,
    { enabled: mode === 'edit' && isOpen, resetKey: group?.id }
  );

  // Reset form when group changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (group) {
        setName(groupName);
        setEmoji(groupEmoji);
        setOverrideListIcons(groupOverrideListIcons);
      } else {
        setName('');
        setEmoji('');
        setOverrideListIcons(false);
      }
      setShowEmojiPicker(false);
    }
  }, [isOpen, group, groupName, groupEmoji, groupOverrideListIcons]);

  const handleSave = () => {
    if (!name.trim()) return;

    if (mode === 'create') {
      addGroup(name.trim(), undefined, emoji, overrideListIcons);
    } else if (group) {
      updateGroup(group.id, { name: name.trim(), emoji, overrideListIcons });
    }

    onClose();
  };

  const handleDelete = () => {
    if (group && confirm('Are you sure you want to delete this group? Lists will be moved to ungrouped.')) {
      deleteGroup(group.id, null);
      onClose();
    }
  };

  // Escape closes the emoji picker first, then the panel
  useEscapeKey(isOpen, () => {
    if (showEmojiPicker) setShowEmojiPicker(false);
    else onClose();
  }, { back: true });

  if (!isOpen) return null;

  const creating = mode === 'create';
  // Lists shown in the preview: the group's own, or two samples when making a new group
  const previewLists = creating
    ? [{ id: 'sample-1', name: 'Sample list', emoji: '' }, { id: 'sample-2', name: 'Another list', emoji: '' }]
    : groupLists.slice(0, 3);
  const hiddenLists = creating ? 0 : Math.max(0, groupLists.length - 3);

  return (
    <SidePanel
      title={creating ? 'New group' : 'Edit group'}
      onClose={onClose}
      footer={
        <>
          <div className="flex min-w-0 items-center gap-2">
            {!creating && group && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="gap-2 text-overdue hover:text-overdue/80">
                <Trash2 size={16} aria-hidden="true" />
                Remove
              </Button>
            )}
            {!creating && group && <AutoSaveIndicator status={saveStatus} />}
          </div>
          <div className="flex gap-2">
            {creating && (
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
            )}
            {/* Changes to an existing group are saved as you make them; "Done" just closes the panel */}
            <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
              {creating ? 'Create group' : 'Done'}
            </Button>
          </div>
        </>
      }
    >
      <EmojiNameField
        name={name}
        emoji={emoji}
        placeholder="Group name"
        onNameChange={setName}
        onEmojiChange={setEmoji}
        pickerOpen={showEmojiPicker}
        onPickerOpenChange={setShowEmojiPicker}
        autoFocus={creating}
        onEnter={creating ? handleSave : undefined}
      />

      <IconOverrideControl value={overrideListIcons} onChange={setOverrideListIcons} emoji={emoji} />

      {/* Preview: how the group looks in the sidebar */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-ink">Preview</h3>
        <div className="rounded-xl border border-line bg-hover/40 p-4">
          <div className="flex items-center gap-2">
            <ChevronDown size={14} aria-hidden="true" className="text-muted" />
            {emoji && <span className="text-sm">{emoji}</span>}
            <span className="truncate text-xs font-medium uppercase tracking-wide text-muted">{name.trim() || 'Group name'}</span>
          </div>
          <div className="ml-[7px] mt-2 space-y-1 border-l border-line pl-3">
            {previewLists.map((list) => (
              <div key={list.id} className="flex items-center gap-2 text-sm text-ink">
                <span className="text-xs">{overrideListIcons && emoji ? emoji : (list.emoji || '📝')}</span>
                <span className="truncate">{list.name}</span>
              </div>
            ))}
            {hiddenLists > 0 && <div className="text-xs text-muted">+{hiddenLists} more</div>}
          </div>
        </div>
      </section>
    </SidePanel>
  );
}
