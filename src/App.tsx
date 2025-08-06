import { useEffect } from 'react';
import { useTaskStore } from './stores/taskStore.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { TaskView } from './components/TaskView.tsx';
import { cn } from './utils/cn.ts';

function App() {
  const { darkMode, sidebarCollapsed } = useTaskStore();

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className={cn(
        'flex-1 flex flex-col transition-all duration-300 min-w-0',
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      )}>
        <TaskView />
      </main>
    </div>
  );
}

export default App;
