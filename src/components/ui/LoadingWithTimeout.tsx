import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { LoadingPlaceholder } from './LoadingPlaceholder.tsx';
import { Button } from './Button.tsx';
import { cn } from '../../utils/cn.ts';

interface LoadingWithTimeoutProps {
  className?: string;
  height?: string;
  message?: string;
  variant?: 'default' | 'minimal' | 'editor';
  timeout?: number; // in milliseconds
  onTimeout?: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function LoadingWithTimeout({ 
  className, 
  height = 'h-32', 
  message = 'Loading...',
  variant = 'default',
  timeout = 10000, // 10 seconds default
  onTimeout,
  onRetry,
  showRetry = true
}: LoadingWithTimeoutProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasTimedOut(true);
      onTimeout?.();
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout, onTimeout]);

  const handleRetry = () => {
    setHasTimedOut(false);
    onRetry?.();
  };

  if (hasTimedOut) {
    const getVariantStyles = () => {
      switch (variant) {
        case 'minimal':
          return 'bg-transparent border-0';
        case 'editor':
          return 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg';
        default:
          return 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl';
      }
    };

    return (
      <div 
        className={cn(
          'w-full flex flex-col items-center justify-center gap-3 p-4 transition-all duration-200',
          height,
          getVariantStyles(),
          className
        )}
      >
        <div className="flex items-center justify-center w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        
        <div className="text-center">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
            Taking longer than expected
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            The component may be slow to load or unavailable
          </p>
        </div>

        {showRetry && onRetry && (
          <Button
            onClick={handleRetry}
            variant="secondary"
            size="sm"
            className="bg-white dark:bg-amber-800 border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-100"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  return (
    <LoadingPlaceholder 
      className={className}
      height={height}
      message={message}
      variant={variant}
    />
  );
}

// Specific variants for common use cases
export function EditorLoadingWithTimeout({ 
  className, 
  message = 'Loading editor...',
  onRetry 
}: Pick<LoadingWithTimeoutProps, 'className' | 'message' | 'onRetry'>) {
  return (
    <LoadingWithTimeout 
      variant="editor" 
      className={className} 
      message={message}
      timeout={8000} // Shorter timeout for editor
      onRetry={onRetry}
    />
  );
}

export function ModalLoadingWithTimeout({ 
  className, 
  message = 'Loading...',
  onRetry 
}: Pick<LoadingWithTimeoutProps, 'className' | 'message' | 'onRetry'>) {
  return (
    <LoadingWithTimeout 
      variant="minimal" 
      height="h-auto" 
      className={cn('py-4', className)} 
      message={message}
      timeout={6000} // Shorter timeout for modals
      onRetry={onRetry}
    />
  );
}
