import { useTaskStore } from '../stores/taskStore.ts';
import { TaskItem } from './TaskItem.tsx';

export function TaskList() {
  const { getTasksForCurrentView } = useTaskStore();
  const tasks = getTasksForCurrentView();

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
          <p className="text-sm">Click "Add Task" to create your first task</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-2 w-full">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
