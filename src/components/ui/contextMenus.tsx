import { 
  Edit3, 
  Star, 
  Trash2, 
  Copy, 
  Calendar, 
  Sun, 
  Eye, 
  EyeOff,
  CheckCircle,
  Circle,
  Plus,
  Settings,
  FolderPlus,
  Palette,
  RotateCcw,
  Pin,
  Globe
} from 'lucide-react';
import type { Task, TaskList } from '../../types/index.ts';
import type { ContextMenuData } from '../ui/ContextMenu.tsx';

// Task Context Menu
export function createTaskContextMenu(
  task: Task,
  actions: {
    onEdit: () => void;
    onDelete: () => void;
    onToggleComplete: () => void;
    onToggleImportant: () => void;
    onToggleMyDay: () => void;
    onTogglePin: () => void;
    onToggleGlobalPin: () => void;
    onDuplicate: () => void;
    onAddToMyDay?: () => void;
    onSetDueDate?: () => void;
  }
): ContextMenuData {
  return {
    x: 0,
    y: 0,
    sections: [
      {
        items: [
          {
            id: 'edit',
            label: 'Edit task',
            icon: <Edit3 size={16} />,
            onClick: actions.onEdit,
          },
          {
            id: 'duplicate',
            label: 'Duplicate task',
            icon: <Copy size={16} />,
            onClick: actions.onDuplicate,
          },
        ],
      },
      {
        items: [
          {
            id: 'complete',
            label: task.completed ? 'Mark as incomplete' : 'Mark as complete',
            icon: task.completed ? <Circle size={16} /> : <CheckCircle size={16} />,
            onClick: actions.onToggleComplete,
          },
          {
            id: 'important',
            label: task.important ? 'Remove from Important' : 'Mark as important',
            icon: <Star size={16} className={task.important ? 'fill-current' : ''} />,
            onClick: actions.onToggleImportant,
          },
          {
            id: 'my-day',
            label: task.myDay ? 'Remove from My Day' : 'Add to My Day',
            icon: <Sun size={16} />,
            onClick: actions.onToggleMyDay,
          },
          {
            id: 'pin',
            label: task.pinned ? 'Unpin from list' : 'Pin to list',
            icon: <Pin size={16} className={task.pinned ? 'fill-current' : ''} />,
            onClick: actions.onTogglePin,
          },
          {
            id: 'global-pin',
            label: task.pinnedGlobally ? 'Unpin globally' : 'Pin globally',
            icon: <Globe size={16} className={task.pinnedGlobally ? 'fill-current' : ''} />,
            onClick: actions.onToggleGlobalPin,
          },
        ],
      },
      {
        items: [
          {
            id: 'due-date',
            label: task.dueDate ? 'Change due date' : 'Set due date',
            icon: <Calendar size={16} />,
            onClick: actions.onSetDueDate || actions.onEdit,
          },
        ],
      },
      {
        items: [
          {
            id: 'delete',
            label: 'Delete task',
            icon: <Trash2 size={16} />,
            onClick: actions.onDelete,
            destructive: true,
            divider: true,
          },
        ],
      },
    ],
  };
}

// List Context Menu
export function createListContextMenu(
  list: TaskList,
  actions: {
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onChangeColor: () => void;
    onArchive?: () => void;
    onHide?: () => void;
    onCreateTask: () => void;
  }
): ContextMenuData {
  const isSystemList = list.isSystem;
  
  return {
    x: 0,
    y: 0,
    sections: [
      {
        items: [
          {
            id: 'create-task',
            label: 'Add task',
            icon: <Plus size={16} />,
            onClick: actions.onCreateTask,
          },
        ],
      },
      {
        items: [
          {
            id: 'edit',
            label: isSystemList ? 'View details' : 'Edit list',
            icon: isSystemList ? <Eye size={16} /> : <Edit3 size={16} />,
            onClick: actions.onEdit,
          },
          ...(isSystemList ? [] : [
            {
              id: 'duplicate',
              label: 'Duplicate list',
              icon: <Copy size={16} />,
              onClick: actions.onDuplicate,
            },
            {
              id: 'change-color',
              label: 'Change color',
              icon: <Palette size={16} />,
              onClick: actions.onChangeColor,
            },
          ]),
        ],
      },
      ...(isSystemList ? [] : [
        {
          items: [
            {
              id: 'hide',
              label: 'Hide list',
              icon: <EyeOff size={16} />,
              onClick: actions.onHide || actions.onEdit,
            },
            {
              id: 'delete',
              label: 'Delete list',
              icon: <Trash2 size={16} />,
              onClick: actions.onDelete,
              destructive: true,
              divider: true,
            },
          ],
        },
      ]),
    ],
  };
}

// General App Context Menu
export function createGeneralContextMenu(
  actions: {
    onCreateTask: () => void;
    onCreateList: () => void;
    onSettings: () => void;
    onRefresh: () => void;
  }
): ContextMenuData {
  return {
    x: 0,
    y: 0,
    sections: [
      {
        items: [
          {
            id: 'create-task',
            label: 'Add task',
            icon: <Plus size={16} />,
            onClick: actions.onCreateTask,
          },
          {
            id: 'create-list',
            label: 'Create new list',
            icon: <FolderPlus size={16} />,
            onClick: actions.onCreateList,
          },
        ],
      },
      {
        items: [
          {
            id: 'refresh',
            label: 'Refresh',
            icon: <RotateCcw size={16} />,
            onClick: actions.onRefresh,
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: <Settings size={16} />,
            onClick: actions.onSettings,
          },
        ],
      },
    ],
  };
}

// Empty Area Context Menu (simplified general menu)
export function createEmptyAreaContextMenu(
  actions: {
    onCreateTask: () => void;
    onCreateList: () => void;
  }
): ContextMenuData {
  return {
    x: 0,
    y: 0,
    sections: [
      {
        items: [
          {
            id: 'create-task',
            label: 'Add task',
            icon: <Plus size={16} />,
            onClick: actions.onCreateTask,
          },
          {
            id: 'create-list',
            label: 'Create new list',
            icon: <FolderPlus size={16} />,
            onClick: actions.onCreateList,
          },
        ],
      },
    ],
  };
}
