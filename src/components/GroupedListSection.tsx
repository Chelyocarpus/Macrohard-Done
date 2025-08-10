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
import { getListDisplayInfo, extractFirstEmoji, removeFirstEmoji } from '../utils/emojiUtils';

interface GroupedListSectionProps {
  group: ListGroup | null;
  lists: TaskList[];
  currentView: string;
  currentListId?: string;
  onSetView: (view: 'list', listId: string) => void;
  sidebarCollapsed: boolean;
}

interface SortableListItemProps {
  list: TaskList;
  isActive: boolean;
  taskCount: number;
  onClick: () => void;
  sidebarCollapsed: boolean;
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
        'transition-colors',
        isOver && 'bg-blue-50 dark:bg-blue-900/20 rounded-md'
      )}
    >
      {children}
    </div>
  );
}

function DroppableUngroupedArea({ children }: { children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'group-null',
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors',
        isOver && 'bg-blue-50 dark:bg-blue-900/20 rounded-md'
      )}
    >
      {children}
    </div>
  );
}

function SortableListItem({ list, isActive, taskCount, onClick, sidebarCollapsed }: SortableListItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-move',
        isDragging && 'opacity-50'
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center px-3 py-2 rounded-md text-left transition-colors relative overflow-hidden',
          isActive
            ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        )}
        style={list.color ? {
          borderLeft: isActive ? `4px solid ${list.color}` : `3px solid transparent`,
          backgroundImage: isActive 
            ? `linear-gradient(90deg, ${list.color}10 0%, transparent 100%)`
            : undefined
        } : undefined}
      >
        {list.color && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-200"
            style={{ 
              backgroundColor: list.color,
              opacity: isActive ? 1 : 0.6,
              width: isActive ? '4px' : '2px'
            }}
          />
        )}
        <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
          {icon ? (
            <span className="text-lg">{icon}</span>
          ) : (
            <List size={20} />
          )}
          {!sidebarCollapsed && (
            <span className="flex-1 truncate">{displayName}</span>
          )}
        </div>
        {!sidebarCollapsed && taskCount > 0 && (
          <span 
            className={cn(
              "text-xs px-2 py-1 rounded-full font-medium relative z-10",
              isActive && list.color
                ? "text-white shadow-sm"
                : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
            )}
            style={isActive && list.color ? { backgroundColor: list.color } : undefined}
          >
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
  sidebarCollapsed 
}: GroupedListSectionProps) {
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupName, setGroupName] = useState(group?.name || '');
  
  const { 
    toggleGroupCollapsed, 
    updateGroup, 
    deleteGroup, 
    addList,
    getTaskCountForList 
  } = useTaskStore();

  const handleAddList = () => {
    const name = prompt('Enter list name:');
    if (name) {
      addList(name, undefined, undefined, group?.id || null);
    }
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
    if (group && confirm(`Delete group "${group.name}"? Lists will be moved to ungrouped.`)) {
      deleteGroup(group.id, null);
    }
    setShowGroupMenu(false);
  };

  if (sidebarCollapsed) {
    return (
      <div className="space-y-1">
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
            />
          );
        })}
      </div>
    );
  }

  if (!group) {
    // Ungrouped lists
    return (
      <SortableContext items={lists.map(l => l.id)} strategy={verticalListSortingStrategy}>
        <DroppableUngroupedArea>
          <div className="space-y-1">
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
                  sidebarCollapsed={false}
                />
              );
            })}
          </div>
        </DroppableUngroupedArea>
      </SortableContext>
    );
  }

  return (
    <div className="mb-4">
      {/* Group Header */}
      <DroppableGroupHeader group={group}>
        <div className="flex items-center justify-between px-3 py-2 mb-1">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => toggleGroupCollapsed(group.id)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {group.collapsed ? (
                <ChevronRight size={16} className="text-gray-500" />
              ) : (
                <ChevronDown size={16} className="text-gray-500" />
              )}
            </button>
          
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
              className="flex-1 px-2 py-1 text-sm font-medium bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 flex-1">
              {group.emoji && <span className="text-sm">{group.emoji}</span>}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {group.name}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleAddList}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Add list to group"
          >
            <Plus size={14} className="text-gray-500" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowGroupMenu(!showGroupMenu)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <MoreHorizontal size={14} className="text-gray-500" />
            </button>
            
            {showGroupMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 min-w-[120px]">
                <button
                  onClick={() => {
                    setEditingGroup(true);
                    setShowGroupMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit3 size={14} />
                  Edit
                </button>
                <button
                  onClick={handleDeleteGroup}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash2 size={14} />
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
        <SortableContext items={lists.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="ml-4 space-y-1">
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
                  sidebarCollapsed={false}
                />
              );
            })}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
