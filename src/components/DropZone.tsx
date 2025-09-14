import { useDroppable } from '@dnd-kit/core';
import { cn } from '../utils/cn';

interface DropZoneProps {
  id: string;
  groupId?: string | null;
  position: number;
  beforeListId?: string;
  afterListId?: string;
  className?: string;
  children?: React.ReactNode;
  showIndicator?: boolean;
}

export function DropZone({ 
  id, 
  groupId, 
  position, 
  beforeListId, 
  afterListId, 
  className,
  children,
  showIndicator = true
}: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type: 'position',
      groupId,
      position,
      beforeListId,
      afterListId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative transition-all duration-200',
        isOver && 'bg-blue-50 dark:bg-blue-900/20',
        className
      )}
    >
      {showIndicator && isOver && (
        <>
          {/* Horizontal drop indicator line */}
          <div className="absolute left-3 right-3 h-0.5 bg-blue-500 rounded-full" 
               style={{ top: '50%', transform: 'translateY(-50%)' }} />
          {/* Drop zone background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-blue-200/30 to-blue-100/50 dark:from-blue-900/20 dark:via-blue-800/10 dark:to-blue-900/20 rounded-md" />
          {/* Visual emphasis dots */}
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-blue-500 rounded-full" />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-blue-500 rounded-full" />
        </>
      )}
      {children}
    </div>
  );
}