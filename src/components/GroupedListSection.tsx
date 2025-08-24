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
        'transition-colors duration-200 relative',
        isOver && 'bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600'
      )}
    >
      {isOver && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10`}>
          <div className="bg-blue-600 dark:bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium">
            📂 Drop to add to group
          </div>
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
        'transition-all duration-200 ease-in-out relative',
        isOver && 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg border-2 border-dashed border-emerald-400 dark:border-emerald-500 p-2 shadow-lg scale-[1.01] transform'
      )}
    >
      {isOver && isMovingFromGroup && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10`}>
          <div className="bg-emerald-600 dark:bg-emerald-500 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg">
            🏠 Drop to ungroup
          </div>
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
        'cursor-grab active:cursor-grabbing transition-opacity duration-200',
        isDragging && 'opacity-50'
      )}
    >
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={cn(
          'w-full flex items-center px-3 py-2 rounded-lg text-left transition-all duration-200 relative overflow-hidden group shadow-sm border-l-2',
          isActive
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-md border-r border-t border-b border-gray-200 dark:border-gray-600'
            : 'bg-gray-50/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-white hover:shadow-md dark:hover:bg-gray-700 border-r border-t border-b border-gray-100 dark:border-gray-700/50',
          isDragging && 'bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-500 shadow-lg scale-105'
        )}
        style={list.color ? {
          borderLeftColor: list.color,
          borderRightColor: isActive ? list.color + '30' : 'transparent',
          borderTopColor: isActive ? list.color + '30' : 'transparent', 
          borderBottomColor: isActive ? list.color + '30' : 'transparent',
          backgroundImage: isActive 
            ? `linear-gradient(90deg, ${list.color}15 0%, ${list.color}05 50%, transparent 100%)`
            : `linear-gradient(90deg, ${list.color}08 0%, transparent 100%)`
        } : {
          borderLeftColor: '#E5E7EB'
        }}
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
        <div className={`flex items-center gap-2.5 flex-1 min-w-0 relative z-10`}>
          {icon ? (
            <span className="text-base">{icon}</span>
          ) : (
            <List size={18} />
          )}
          {!sidebarCollapsed && (
            <span className="flex-1 truncate">{displayName}</span>
          )}
        </div>
        {!sidebarCollapsed && taskCount > 0 && (
          <span 
            className={cn(
              `text-xs px-2 py-1 rounded-full font-medium relative z-10`,
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
      <div className="mb-7">
        <SortableContext items={lists.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <DroppableUngroupedArea activeId={activeId} lists={lists}>
            <div className="space-y-1.5">
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
                    onEditList={handleEditList}
                    onCreateTask={handleCreateTask}
                  />
                );
              })}
            </div>
          </DroppableUngroupedArea>
        </SortableContext>
      </div>
    );
  }

  return (
    <div className="mb-5">
      {/* Group Container with Cohesive Design */}
      <div 
        className="relative bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50 rounded-xl border-l-4 border-r border-t border-b border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
        style={group.color ? {
          borderLeftColor: group.color,
          borderRightColor: `${group.color}30`,
          borderTopColor: `${group.color}30`,
          borderBottomColor: `${group.color}30`,
          backgroundColor: `${group.color}03`
        } : undefined}
      >
        {/* Group Header */}
        <DroppableGroupHeader group={group}>
          <div 
            className="relative bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b border-gray-200 dark:border-gray-700"
            style={group.color ? {
              borderBottomColor: `${group.color}30`,
              background: `linear-gradient(135deg, ${group.color}08 0%, ${group.color}03 100%)`
            } : undefined}
          >
            <div className="flex items-center px-3 py-2.5">
              {/* Collapse Button - Compact */}
              <button
                onClick={() => toggleGroupCollapsed(group.id)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0 mr-1.5"
              >
                {group.collapsed ? (
                  <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-600 dark:text-gray-400" />
                )}
              </button>
              
              {/* Group Name Section - Maximum space allocation */}
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
                    className="w-full px-2 py-1 text-sm font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                ) : (
                  <>
                    {group.emoji && (
                      <span className="text-base flex-shrink-0" aria-hidden="true">
                        {group.emoji}
                      </span>
                    )}
                    <span 
                      className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate"
                      title={group.name}
                    >
                      {group.name}
                    </span>
                  </>
                )}
              </div>
              
              {/* Action Buttons - Compact */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={handleAddList}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Add list to group"
                >
                  <Plus size={14} className="text-gray-600 dark:text-gray-400" />
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setShowGroupMenu(!showGroupMenu)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    <MoreHorizontal size={14} className="text-gray-600 dark:text-gray-400" />
                  </button>
                  
                  {showGroupMenu && (
                    <div className={`absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-30 min-w-[120px]`}>
                      <button
                        onClick={() => {
                          setShowGroupEditSidebar(true);
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
          </div>
        </DroppableGroupHeader>

        {/* Group Lists with Enhanced Visual Grouping */}
        {!group.collapsed && (
          <div className="relative">
            <SortableContext items={lists.map(l => l.id)} strategy={verticalListSortingStrategy}>
              <div className="px-3 py-2 space-y-1.5">
                {lists.map((list) => {
                  const isActive = currentView === 'list' && currentListId === list.id;
                  const taskCount = getTaskCountForList(list.id);
                  
                  return (
                    <div key={list.id} className="relative">
                      <div className="ml-3 relative z-10">
                        <SortableListItem
                          list={list}
                          isActive={isActive}
                          taskCount={taskCount}
                          onClick={() => onSetView('list', list.id)}
                          sidebarCollapsed={false}
                          onEditList={handleEditList}
                          onCreateTask={handleCreateTask}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </div>
        )}
      </div>
      
      {/* Add List Modal */}
      <ListEditSidebar
        isOpen={showAddListModal}
        onClose={() => setShowAddListModal(false)}
        mode="create"
        groupId={group?.id || null}
      />

      {/* Edit List Modal */}
      {editingList && (
        <ListEditSidebar
          list={editingList}
          isOpen={!!editingList}
          mode="edit"
          onClose={() => setEditingList(null)}
        />
      )}
      
      {/* Group Edit Sidebar */}
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
