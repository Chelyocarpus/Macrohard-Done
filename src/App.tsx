import { useEffect, useState } from 'react';
import { useTaskStore } from './stores/taskStore.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { TaskView } from './components/TaskView.tsx';
import { GroupEditModal } from './components/GroupEditModal.tsx';
import { ContextMenuProvider } from './components/ui/ContextMenu.tsx';
import { ToastProvider } from './components/ui/ToastProvider.tsx';
import { cn } from './utils/cn.ts';

function App() {
  const { darkMode, sidebarCollapsed } = useTaskStore();
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAddListModal, setShowAddListModal] = useState(false);

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <ContextMenuProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar 
          setShowAddGroupModal={setShowAddGroupModal}
          showAddListModal={showAddListModal}
          setShowAddListModal={setShowAddListModal}
        />
        <main className={cn(
          'flex-1 flex flex-col transition-all duration-300 min-w-0 relative',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}>
          <TaskView />
        </main>

        {/* Group Modal - rendered at root level for proper z-index */}
        <GroupEditModal
          isOpen={showAddGroupModal}
          onClose={() => setShowAddGroupModal(false)}
        />
        
        {/* Toast notifications */}
        <ToastProvider />
      </div>
    </ContextMenuProvider>
  );
}

export default App;
