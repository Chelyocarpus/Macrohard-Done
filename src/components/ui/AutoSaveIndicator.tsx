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
          <Loader2 size={16} className="animate-spin text-accent" />
          <span className="text-accent">Saving...</span>
        </>
      )}
      
      {status === 'saved' && (
        <>
          <CheckCircle size={16} className="text-done" />
          <span className="text-done">Saved</span>
        </>
      )}
      
      {status === 'error' && (
        <>
          <AlertCircle size={16} className="text-overdue" />
          <span className="text-overdue">Save failed</span>
        </>
      )}
    </div>
  );
}
