import { HOVER_TINT_CLASS, hoverTintStyle, selectionStyle } from '../utils/accentTheme.ts';
import { useState } from 'react';
import {
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Trash2, Edit3 } from 'lucide-react';
import { cn } from '../utils/cn';
import { withCount } from '../utils/accessibleNames.ts';
import { moveWithin } from '../utils/listOrder.ts';
import { useTaskStore } from '../stores/taskStore';
import { useShallow } from 'zustand/react/shallow';
import type { TaskList, ListGroup } from '../types';
import { ListEditSidebar } from './ListEditSidebar';
import { GroupEditSidebar } from './GroupEditSidebar';
import { getListDisplayInfo, extractFirstEmoji, removeFirstEmoji, groupIconOverride } from '../utils/emojiUtils';
import { ListGlyph } from './SidebarGlyphs.tsx';
import { useContextMenuHandler, useContextMenuButtonHandler } from './ui/useContextMenu.ts';
import { createListContextMenu } from './ui/contextMenus.tsx';
import { DropZone } from './DropZone.tsx';
import { Tooltip } from './ui/Tooltip.tsx';

/** The group heading's add and menu buttons: 32px to hit (44px on touch screens), with a 16px icon */
const GROUP_ACTION_CLASS =
  'hit-area flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-hover hover:text-ink transition-colors [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11';

interface GroupedListSectionProps {
  group: ListGroup | null;
  lists: TaskList[];
  currentView: string;
  currentListId?: string;
  onSetView: (view: 'list', listId: string) => void;
  activeId: string | null;
}

interface SortableListItemProps {
  /** The icon the list's group sets for all its lists, if it does */
  groupIcon?: string;
  list: TaskList;
  isActive: boolean;
  taskCount: number;
  onClick: () => void;
  onEditList: (list: TaskList) => void;
  onCreateTask: (listId: string) => void;
  /** Move the list one place up (-1) or down (1) among its siblings, and whether that is possible */
  onMove: (listId: string, delta: -1 | 1) => void;
  canMove: (listId: string, delta: -1 | 1) => boolean;
}

interface DroppableGroupHeaderProps {
  group: ListGroup;
  children: React.ReactNode;
}

function DroppableGroupHeader({ group, children }: DroppableGroupHeaderProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `group-${group.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors duration-200',
        isOver && 'bg-sidebar rounded'
      )}
    >
      {isOver && (
        <div className="text-xs text-muted px-3 py-1 mb-1">
          Drop to add to group
        </div>
      )}
      {children}
    </div>
  );
}

function DroppableUngroupedArea({ children, activeId, lists }: { children: React.ReactNode; activeId: string | null; lists: TaskList[] }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'group-null',
  });

  // Find the active list to check if it's in a group
  const activeList = activeId ? lists.find(list => list.id === activeId) : null;
  const isMovingFromGroup = activeList?.groupId != null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors duration-200',
        isOver && 'bg-sidebar rounded'
      )}
    >
      {isOver && isMovingFromGroup && (
        <div className="text-xs text-muted px-3 py-1 mb-1">
          Drop to ungroup
        </div>
      )}
      {children}
    </div>
  );
}

function SortableListItem({ list, groupIcon, isActive, taskCount, onClick, onEditList, onCreateTask, onMove, canMove }: SortableListItemProps) {
  const { deleteList, duplicateList } = useTaskStore(useShallow((state) => ({ deleteList: state.deleteList, duplicateList: state.duplicateList })));
  const {
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { displayName } = getListDisplayInfo(list);

  // The same menu opens from a right-click and from the visible "more" button (for touch screens)
  const getListMenu = () => createListContextMenu(list, {
    onEdit: () => onEditList(list),
    onDelete: () => deleteList(list.id),
    onDuplicate: () => { duplicateList(list.id); },
    onChangeColor: () => onEditList(list),
    onCreateTask: () => onCreateTask(list.id),
    onMoveUp: canMove(list.id, -1) ? () => onMove(list.id, -1) : null,
    onMoveDown: canMove(list.id, 1) ? () => onMove(list.id, 1) : null,
  });
  const handleContextMenu = useContextMenuHandler(getListMenu);
  const handleMenuButtonClick = useContextMenuButtonHandler(getListMenu);

  return (
    <div
      ref={setNodeRef}
      style={style}
      // Dragging only: the pointer listeners. The drag library's own attributes (role="button", a tab stop, "sortable")
      // are left off on purpose: this wrapper holds two real buttons (the list and its "more" menu), and a button inside
      // a button is announced twice and is not allowed. Moving a list without a mouse is "Move up" / "Move down" in the
      // list's menu.
      {...listeners}
      className={cn(
        'group/list relative transition-opacity duration-200',
        isDragging && 'opacity-50'
      )}
    >
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        aria-label={withCount(displayName, taskCount)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'w-full flex items-center px-3 min-h-8 [@media(pointer:coarse)]:min-h-11 rounded-md text-left transition-[background-color,color,opacity,transform] duration-200 text-sm relative group',
          isActive
            ? cn('text-ink', !list.color && 'bg-hover shadow-[inset_3px_0_0_rgb(var(--c-accent))]')
            : cn('text-ink', HOVER_TINT_CLASS),
          isDragging && 'opacity-40 scale-95 bg-accent/10 border border-accent/30 rounded-md'
        )}
        // The open list is tinted and barred in its own colour (blue when it has none)
        style={isActive ? (selectionStyle(list.color) ? { backgroundColor: selectionStyle(list.color)?.backgroundColor } : undefined) : hoverTintStyle(list.color)}
      >
        {list.color && (
          <div
            aria-hidden="true"
            className={cn('absolute left-0.5 top-1.5 bottom-1.5 rounded-full', isActive ? 'w-[3px]' : 'w-0.5')}
            style={{ backgroundColor: list.color }}
          />
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ListGlyph list={list} icon={groupIcon} />
          <span className="flex-1 truncate">{displayName}</span>
        </div>
        
        {/* The count gives way to the "more" button while the row is hovered or focused */}
        {taskCount > 0 && (
          <span aria-hidden="true" className="text-xs tabular-nums text-muted font-normal transition-opacity group-hover/list:opacity-0 group-focus-within/list:opacity-0 [@media(hover:none)]:mr-8 [@media(pointer:coarse)]:mr-10">
            {taskCount}
          </span>
        )}
      </button>

      {/* "More" button: opens the right-click menu. Always shown on touch screens, otherwise on hover or keyboard focus. */}
        <Tooltip label="More actions" className="absolute right-1 top-1/2 -translate-y-1/2">
          <button
            type="button"
            aria-label={`More actions for ${displayName}`}
            aria-haspopup="menu"
            onClick={handleMenuButtonClick}
            className="hit-area flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-line hover:text-ink opacity-0 group-hover/list:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
          >
            <MoreHorizontal size={16} />
          </button>
        </Tooltip>
    </div>
  );
}

export function GroupedListSection({ 
  group, 
  lists, 
  currentView, 
  currentListId, 
  onSetView, 
  activeId
}: GroupedListSectionProps) {
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupName, setGroupName] = useState(group?.name || '');
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [editingList, setEditingList] = useState<TaskList | null>(null);
  const [showGroupEditSidebar, setShowGroupEditSidebar] = useState(false);
  
  // Selected: only what is used here. `tasks` is listed too because the getters below read it; without it a change would not re-render.
  const { toggleGroupCollapsed, updateGroup, deleteGroup, getTaskCountForList, setView, reorderLists } = useTaskStore(useShallow((state) => ({ toggleGroupCollapsed: state.toggleGroupCollapsed, updateGroup: state.updateGroup, deleteGroup: state.deleteGroup, getTaskCountForList: state.getTaskCountForList, setView: state.setView, reorderLists: state.reorderLists, tasks: state.tasks })));

  // "Move up" / "Move down" in a list's menu: the way to reorder without dragging.
  //
  // Robustness / pitfalls guarded against:
  // - Stale order: the siblings are read from the store at the moment of the click, not from what was drawn when the
  //   menu opened, so a change made in between (another tab, a drag) is never overwritten with an old order.
  // - First/last place: `moveWithin` returns null and nothing is written (the menu also switches the item off).
  // - Only this group's own lists are renumbered (`reorderLists` leaves other groups alone), and system lists never move.
  const moveList = (listId: string, delta: -1 | 1) => {
    const siblings = useTaskStore.getState().lists
      .filter((list) => !list.isSystem && (list.groupId ?? null) === (group?.id ?? null))
      .sort((a, b) => a.order - b.order)
      .map((list) => list.id);
    const next = moveWithin(siblings, listId, delta);
    if (next) reorderLists(group?.id ?? null, next);
  };
  const canMove = (listId: string, delta: -1 | 1) => moveWithin(lists.map((list) => list.id), listId, delta) !== null;

  const handleAddList = () => {
    setShowAddListModal(true);
  };

  const handleEditList = (list: TaskList) => {
    setEditingList(list);
  };

  const handleCreateTask = (listId: string) => {
    setView('list', listId);
    // For now, just switch to the list view. Could open a task creation sidebar in the future
  };
  const handleSaveGroup = () => {
    if (group && groupName.trim()) {
      const emoji = extractFirstEmoji(groupName.trim());
      const cleanName = removeFirstEmoji(groupName.trim());
      updateGroup(group.id, { 
        name: cleanName || groupName.trim(), 
        emoji: emoji || group.emoji 
      });
    }
    setEditingGroup(false);
  };

  const handleDeleteGroup = () => {
    if (group && confirm(`Remove group "${group.name}"? Lists will be moved to ungrouped.`)) {
      deleteGroup(group.id, null);
    }
    setShowGroupMenu(false);
  };

  // Lists drawn under the group's heading: all of them, or only the open one while the group is collapsed
  const shownLists = group?.collapsed ? lists.filter((list) => currentView === 'list' && currentListId === list.id) : lists;

  if (!group) {
    // Ungrouped lists
    return (
      <div className="mb-2">
        <SortableContext items={lists.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <DroppableUngroupedArea activeId={activeId} lists={lists}>
            <div className="">
              {/* Drop zone at the beginning */}
              <DropZone
                id={`drop-ungrouped-start`}
                groupId={null}
                position={0}
                className="h-0.5"
              />
              
              {lists.map((list, index) => {
                const isActive = currentView === 'list' && currentListId === list.id;
                const taskCount = getTaskCountForList(list.id);
                
                return (
                  <div key={list.id}>
                    <SortableListItem
                      list={list}
                      isActive={isActive}
                      taskCount={taskCount}
                      onClick={() => onSetView('list', list.id)}
                      onEditList={handleEditList}
                      onCreateTask={handleCreateTask}
                      onMove={moveList}
                      canMove={canMove}
                    />
                    {/* Drop zone after each item */}
                    <DropZone
                      id={`drop-ungrouped-${index + 1}`}
                      groupId={null}
                      position={index + 1}
                      afterListId={list.id}
                      className="h-0.5"
                    />
                  </div>
                );
              })}
            </div>
          </DroppableUngroupedArea>
        </SortableContext>
      </div>
    );
  }

  return (
    <div className="mb-1">
      {/* Group Header: the add and menu buttons show when the heading is hovered or focused (always on touch screens) */}
      <DroppableGroupHeader group={group}>
        <div className="group/head relative px-3 py-0.5 min-h-8 flex items-center [@media(pointer:coarse)]:min-h-11">
          {/* Collapse Button */}
          <button
            onClick={() => toggleGroupCollapsed(group.id)}
            aria-label={`${group.collapsed ? 'Expand' : 'Collapse'} group ${group.name}`}
            aria-expanded={!group.collapsed}
            className="hit-area flex h-8 w-8 items-center justify-center hover:bg-hover rounded transition-colors mr-1 -ml-1 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
          >
            {group.collapsed ? (
              <ChevronRight size={14} className="text-muted" />
            ) : (
              <ChevronDown size={14} className="text-muted" />
            )}
          </button>
          
          {/* Group Name */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {editingGroup ? (
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onBlur={handleSaveGroup}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveGroup();
                  if (e.key === 'Escape') {
                    setGroupName(group.name);
                    setEditingGroup(false);
                  }
                }}
                className="w-full px-1 py-0.5 text-xs font-medium bg-canvas border border-line rounded focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
            ) : (
              <>
                {group.emoji && (
                  <span className="text-xs" aria-hidden="true">
                    {group.emoji}
                  </span>
                )}
                {/* Wraps instead of being cut with "...": a group's name is the only thing that says what is in it */}
                <span title={group.name} className="min-w-0 text-xs font-medium text-muted uppercase tracking-wide [overflow-wrap:anywhere]">
                  {group.name}
                </span>
              </>
            )}
          </div>
          
          {/* Action Buttons */}
          {/* With a mouse the buttons lie over the end of the heading while it is hovered or focused, so they take no room
              from the name the rest of the time. Touch screens have no hover: there they stay in the row and the name wraps. */}
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-md bg-sidebar opacity-0 transition-opacity group-hover/head:opacity-100 focus-within:opacity-100 [@media(hover:none)]:static [@media(hover:none)]:translate-y-0 [@media(hover:none)]:bg-transparent [@media(hover:none)]:opacity-100">
            <Tooltip label="Add list to group">
              <button
                onClick={handleAddList}
                className={GROUP_ACTION_CLASS}
                aria-label="Add list to group"
              >
                <Plus size={16} />
              </button>
            </Tooltip>
            
            <div className="relative">
              {/* Not while the menu is open: the tooltip would sit on top of it */}
              <Tooltip label="Group actions" disabled={showGroupMenu}>
                <button
                  onClick={() => setShowGroupMenu(!showGroupMenu)}
                  aria-label={`Group actions for ${group.name}`}
                  aria-haspopup="menu"
                  aria-expanded={showGroupMenu}
                  className={GROUP_ACTION_CLASS}
                >
                  <MoreHorizontal size={16} />
                </button>
              </Tooltip>

              {showGroupMenu && (
                <div className="absolute right-0 top-full mt-1 bg-canvas border border-line rounded-md shadow-lg z-30 min-w-[120px]">
                  <button
                    onClick={() => {
                      setShowGroupEditSidebar(true);
                      setShowGroupMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-hover flex items-center gap-2"
                  >
                    <Edit3 size={12} />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteGroup}
                    className="w-full px-3 py-2 text-left text-sm text-overdue hover:bg-overdue/10 flex items-center gap-2"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DroppableGroupHeader>

      {/* Group Lists. A collapsed group still shows the list that is open, so the sidebar always says where you are. */}
      {shownLists.length > 0 && (
        <div className="ml-[18px] pl-1 border-l border-line">
          <SortableContext items={shownLists.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="">
              {/* Drop zone at the beginning of the group */}
              {!group.collapsed && (
                <DropZone
                  id={`drop-group-${group.id}-start`}
                  groupId={group.id}
                  position={0}
                  className="h-0.5"
                />
              )}

              {shownLists.map((list, index) => {
                const isActive = currentView === 'list' && currentListId === list.id;
                const taskCount = getTaskCountForList(list.id);

                return (
                  <div key={list.id}>
                    <SortableListItem
                      list={list}
                      groupIcon={groupIconOverride(group)}
                      isActive={isActive}
                      taskCount={taskCount}
                      onClick={() => onSetView('list', list.id)}
                      onEditList={handleEditList}
                      onCreateTask={handleCreateTask}
                      onMove={moveList}
                      canMove={canMove}
                    />
                    {/* Drop zone after each item */}
                    {!group.collapsed && (
                      <DropZone
                        id={`drop-group-${group.id}-${index + 1}`}
                        groupId={group.id}
                        position={index + 1}
                        afterListId={list.id}
                        className="h-0.5"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </div>
      )}

      {/* Modals */}
      <ListEditSidebar
        isOpen={showAddListModal}
        onClose={() => setShowAddListModal(false)}
        mode="create"
        groupId={group?.id || null}
      />

      {editingList && (
        <ListEditSidebar
          list={editingList}
          isOpen={!!editingList}
          mode="edit"
          onClose={() => setEditingList(null)}
        />
      )}
      
      {group && (
        <GroupEditSidebar
          group={group}
          isOpen={showGroupEditSidebar}
          onClose={() => setShowGroupEditSidebar(false)}
          mode="edit"
        />
      )}
    </div>
  );
}
