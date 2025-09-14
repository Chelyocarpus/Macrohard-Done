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
import { ChevronDown, ChevronRight, List, MoreHorizontal, Plus, Trash2, Edit3 } from 'lucide-react';
import { cn } from '../utils/cn';
import { useTaskStore } from '../stores/taskStore';
import type { TaskList, ListGroup } from '../types';
import { ListEditSidebar } from './ListEditSidebar';
import { GroupEditSidebar } from './GroupEditSidebar';
import { getListDisplayInfo, extractFirstEmoji, removeFirstEmoji } from '../utils/emojiUtils';
import { useContextMenuHandler } from './ui/useContextMenu.ts';
import { createListContextMenu } from './ui/contextMenus.tsx';
import { DropZone } from './DropZone.tsx';

interface GroupedListSectionProps {
  group: ListGroup | null;
  lists: TaskList[];
  currentView: string;
  currentListId?: string;
  onSetView: (view: 'list', listId: string) => void;
  sidebarCollapsed: boolean;
  activeId: string | null;
}

interface SortableListItemProps {
  list: TaskList;
  isActive: boolean;
  taskCount: number;
  onClick: () => void;
  sidebarCollapsed: boolean;
  onEditList: (list: TaskList) => void;
  onCreateTask: (listId: string) => void;
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
        isOver && 'bg-gray-50 dark:bg-gray-800 rounded'
      )}
    >
      {isOver && (
        <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1 mb-1">
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
        isOver && 'bg-gray-50 dark:bg-gray-800 rounded'
      )}
    >
      {isOver && isMovingFromGroup && (
        <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1 mb-1">
          Drop to ungroup
        </div>
      )}
      {children}
    </div>
  );
}

function SortableListItem({ list, isActive, taskCount, onClick, sidebarCollapsed, onEditList, onCreateTask }: SortableListItemProps) {
  const { deleteList, addTask } = useTaskStore();
  const {
    attributes,
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

  const { displayName, icon } = getListDisplayInfo(list);

  // Context menu handler for list items
  const handleContextMenu = useContextMenuHandler(() => {
    return createListContextMenu(list, {
      onEdit: () => onEditList(list),
      onDelete: () => deleteList(list.id),
      onDuplicate: () => {
        // Create a duplicate list
        addTask(`${list.name} Copy`, list.id);
      },
      onChangeColor: () => onEditList(list),
      onCreateTask: () => onCreateTask(list.id),
    });
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'transition-opacity duration-200',
        isDragging && 'opacity-50'
      )}
    >
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={cn(
          'w-full flex items-center px-3 py-1.5 text-left transition-all duration-200 text-sm relative group',
          isActive
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
          isDragging && 'opacity-40 scale-95 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md'
        )}
      >
        {list.color && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-0.5"
            style={{ backgroundColor: list.color }}
          />
        )}
        <div className={`flex items-center gap-2 flex-1 min-w-0 ${list.color ? 'ml-2' : ''}`}>
          {icon ? (
            <span className="text-sm">{icon}</span>
          ) : (
            <List size={14} />
          )}
          {!sidebarCollapsed && (
            <span className="flex-1 truncate">{displayName}</span>
          )}
        </div>
        
        {/* Drag handle indicator - only show on hover */}
        {!sidebarCollapsed && (
          <div className="opacity-0 group-hover:opacity-50 transition-opacity duration-200 mr-1">
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
            </div>
          </div>
        )}
        
        {!sidebarCollapsed && taskCount > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
            {taskCount}
          </span>
        )}
      </button>
    </div>
  );
}

export function GroupedListSection({ 
  group, 
  lists, 
  currentView, 
  currentListId, 
  onSetView, 
  sidebarCollapsed,
  activeId
}: GroupedListSectionProps) {
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupName, setGroupName] = useState(group?.name || '');
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [editingList, setEditingList] = useState<TaskList | null>(null);
  const [showGroupEditSidebar, setShowGroupEditSidebar] = useState(false);
  
  const { 
    toggleGroupCollapsed, 
    updateGroup, 
    deleteGroup,
    getTaskCountForList,
    setView
  } = useTaskStore();

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

  if (sidebarCollapsed) {
    return (
      <div className="">
        {lists.map((list) => {
          const isActive = currentView === 'list' && currentListId === list.id;
          const taskCount = getTaskCountForList(list.id);
          
          return (
            <SortableListItem
              key={list.id}
              list={list}
              isActive={isActive}
              taskCount={taskCount}
              onClick={() => onSetView('list', list.id)}
              sidebarCollapsed={true}
              onEditList={handleEditList}
              onCreateTask={handleCreateTask}
            />
          );
        })}
      </div>
    );
  }

  if (!group) {
    // Ungrouped lists
    return (
      <div className="mb-4">
        <SortableContext items={lists.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <DroppableUngroupedArea activeId={activeId} lists={lists}>
            <div className="">
              {/* Drop zone at the beginning */}
              <DropZone
                id={`drop-ungrouped-start`}
                groupId={null}
                position={0}
                className="h-2"
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
                      sidebarCollapsed={false}
                      onEditList={handleEditList}
                      onCreateTask={handleCreateTask}
                    />
                    {/* Drop zone after each item */}
                    <DropZone
                      id={`drop-ungrouped-${index + 1}`}
                      groupId={null}
                      position={index + 1}
                      afterListId={list.id}
                      className="h-2"
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
    <div className="mb-4">
      {/* Group Header */}
      <DroppableGroupHeader group={group}>
        <div className="px-3 py-1 flex items-center">
          {/* Collapse Button */}
          <button
            onClick={() => toggleGroupCollapsed(group.id)}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors mr-1.5"
          >
            {group.collapsed ? (
              <ChevronRight size={12} className="text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown size={12} className="text-gray-500 dark:text-gray-400" />
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
                className="w-full px-1 py-0.5 text-xs font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <>
                {group.emoji && (
                  <span className="text-xs" aria-hidden="true">
                    {group.emoji}
                  </span>
                )}
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide truncate">
                  {group.name}
                </span>
              </>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleAddList}
              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Add list to group"
            >
              <Plus size={12} className="text-gray-500 dark:text-gray-400" />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <MoreHorizontal size={12} className="text-gray-500 dark:text-gray-400" />
              </button>
              
              {showGroupMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-30 min-w-[120px]">
                  <button
                    onClick={() => {
                      setShowGroupEditSidebar(true);
                      setShowGroupMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Edit3 size={12} />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteGroup}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
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

      {/* Group Lists */}
      {!group.collapsed && (
        <div className="ml-4">
          <SortableContext items={lists.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="">
              {/* Drop zone at the beginning of the group */}
              <DropZone
                id={`drop-group-${group.id}-start`}
                groupId={group.id}
                position={0}
                className="h-2"
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
                      sidebarCollapsed={false}
                      onEditList={handleEditList}
                      onCreateTask={handleCreateTask}
                    />
                    {/* Drop zone after each item */}
                    <DropZone
                      id={`drop-group-${group.id}-${index + 1}`}
                      groupId={group.id}
                      position={index + 1}
                      afterListId={list.id}
                      className="h-2"
                    />
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
