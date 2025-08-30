import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.ts';
import type { SaveStatus } from '../../hooks/useAutoSave.ts';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export function AutoSaveIndicator({ status, className }: AutoSaveIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm font-medium transition-all duration-200",
      className
    )}>
      {status === 'saving' && (
        <>
          <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-blue-600 dark:text-blue-400">Saving...</span>
        </>
      )}
      
      {status === 'saved' && (
        <>
          <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
          <span className="text-green-600 dark:text-green-400">Saved</span>
        </>
      )}
      
      {status === 'error' && (
        <>
          <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
          <span className="text-red-600 dark:text-red-400">Save failed</span>
        </>
      )}
    </div>
  );
}
