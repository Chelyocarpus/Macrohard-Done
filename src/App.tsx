import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTaskStore } from './stores/taskStore.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { TaskView } from './components/TaskView.tsx';
import { TaskDetailSidebar } from './components/TaskDetailSidebar.tsx';
import { GroupEditModal } from './components/GroupEditModal.tsx';
import { Button } from './components/ui/Button.tsx';
import { ContextMenuProvider } from './components/ui/ContextMenu.tsx';
import { ToastProvider } from './components/ui/ToastProvider.tsx';
import { cn } from './utils/cn.ts';

function App() {
  const { darkMode, sidebarCollapsed, currentView, currentListId } = useTaskStore();
  const [showFabSidebar, setShowFabSidebar] = useState(false);
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

  // Global keyboard shortcuts for the FAB
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+Ctrl+N or Shift+Cmd+N to open FAB quick add
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowFabSidebar(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          
          {/* Floating Action Button - positioned within main content area */}
          {/* Hide FAB when any modal is open */}
          {!showFabSidebar && !showAddGroupModal && !showAddListModal && (
            <Button
              onClick={() => setShowFabSidebar(true)}
              className={cn(
                "absolute bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl z-40",
                "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
                "transform hover:scale-110 transition-all duration-200",
                "flex items-center justify-center text-white border-0",
                "hover:shadow-blue-500/25 focus:ring-4 focus:ring-blue-500/25"
              )}
              title="Quick Add Task (Shift+Ctrl+N)"
            >
              <Plus size={24} />
            </Button>
          )}
        </main>

        {/* FAB Task Sidebar */}
        <TaskDetailSidebar
          isOpen={showFabSidebar}
          onClose={() => setShowFabSidebar(false)}
          mode="create"
          initialListId={currentView === 'list' ? currentListId : 'all'}
        />

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
