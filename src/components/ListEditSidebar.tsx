import { useState, useEffect, useCallback } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey.ts';
import { Trash2 } from 'lucide-react';
import { ListPagePreview } from './ListPagePreview.tsx';
import type { TaskList } from '../types/index.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { useShallow } from 'zustand/react/shallow';
import { Button } from './ui/Button.tsx';
import { SidePanel } from './ui/SidePanel.tsx';
import { EmojiNameField } from './EmojiNameField.tsx';
import { ColorSwatches } from './ColorSwatches.tsx';
import { AutoSaveIndicator } from './ui/AutoSaveIndicator.tsx';
import { useAutoSave } from '../hooks/useAutoSave.ts';
import { getListDisplayInfo, groupIconOverride } from '../utils/emojiUtils.ts';
import { DEFAULT_LIST_COLOR } from '../utils/listColors.ts';

interface ListEditSidebarProps {
  list?: TaskList;
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  groupId?: string | null;
}

export function ListEditSidebar({ list, isOpen, onClose, mode, groupId }: ListEditSidebarProps) {
  const { addList, updateList, deleteList } = useTaskStore(useShallow((state) => ({ addList: state.addList, updateList: state.updateList, deleteList: state.deleteList })));

  const listGroups = useTaskStore((state) => state.listGroups);

  const { name: listName = '', emoji: listEmoji = '', color: listColor = DEFAULT_LIST_COLOR } = list || {};

  const [name, setName] = useState(listName);
  const [emoji, setEmoji] = useState(listEmoji);
  const [color, setColor] = useState(listColor);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Auto-save setup for edit mode
  const autoSaveFunction = useCallback(() => {
    if (mode === 'edit' && list && name.trim()) {
      updateList(list.id, { name: name.trim(), emoji, color });
    }
  }, [mode, list, updateList, name, emoji, color]);

  const currentValues = { name: name.trim(), emoji, color };
  const originalValues = { name: listName, emoji: listEmoji, color: listColor };

  // Auto-save hook - only enabled in edit mode
  const { saveStatus } = useAutoSave(
    autoSaveFunction,
    currentValues,
    originalValues,
    { enabled: mode === 'edit' && isOpen, resetKey: list?.id }
  );

  // Escape closes the emoji picker first, then the panel
  useEscapeKey(isOpen, () => {
    if (showEmojiPicker) setShowEmojiPicker(false);
    else onClose();
  }, { back: true });

  // Reset form when list changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (list) {
        // For existing lists, extract emoji from name if no explicit emoji is set
        const { displayName, icon } = getListDisplayInfo(list);
        setName(displayName);
        setEmoji(icon || '');
      } else {
        setName('');
        setEmoji('');
      }
      setColor(listColor);
      setShowEmojiPicker(false);
    }
  }, [isOpen, list, listColor]);

  const handleSave = () => {
    if (!name.trim()) return;

    if (mode === 'create') {
      addList(name.trim(), color, emoji, groupId);
    } else if (list) {
      updateList(list.id, { name: name.trim(), emoji, color });
    }

    onClose();
  };

  const handleDelete = () => {
    // No confirm: deleting shows an "Undo" toast instead
    if (list) {
      deleteList(list.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  const creating = mode === 'create';
  // The group may set one icon for all its lists; the page then shows that one
  const groupIcon = groupIconOverride(listGroups.find((group) => group.id === (creating ? groupId : list?.groupId)));

  return (
    <SidePanel
      title={creating ? 'New list' : 'Edit list'}
      onClose={onClose}
      footer={
        <>
          <div className="flex min-w-0 items-center gap-2">
            {!creating && list && !list.isSystem && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="gap-2 text-overdue hover:text-overdue/80">
                <Trash2 size={16} aria-hidden="true" />
                Remove
              </Button>
            )}
            {!creating && list && <AutoSaveIndicator status={saveStatus} />}
          </div>
          <div className="flex gap-2">
            {creating && (
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
            )}
            {/* Changes to an existing list are saved as you make them; "Done" just closes the panel */}
            <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
              {creating ? 'Create list' : 'Done'}
            </Button>
          </div>
        </>
      }
    >
      <EmojiNameField
        name={name}
        emoji={emoji}
        color={color}
        placeholder="List name"
        onNameChange={setName}
        onEmojiChange={setEmoji}
        pickerOpen={showEmojiPicker}
        onPickerOpenChange={setShowEmojiPicker}
        autoFocus={creating}
        onEnter={creating ? handleSave : undefined}
      />

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-ink">Color</h3>
        <ColorSwatches value={color} onChange={setColor} />
      </section>

      {/* Preview: how the list's page will look in this color */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-ink">Preview</h3>
        <ListPagePreview name={name} emoji={groupIcon ?? emoji} color={color} />
      </section>
    </SidePanel>
  );
}
