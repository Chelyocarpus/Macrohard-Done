import { useTaskStore } from '../stores/taskStore.ts';
import { TaskItem } from './TaskItem.tsx';

export function TaskList() {
  const { getTasksForCurrentView } = useTaskStore();
  const tasks = getTasksForCurrentView();

  return (
    <div className="p-6 w-full">
      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
            <p className="text-sm">Use the blue button in the corner or press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+N</kbd> to create your first task</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
