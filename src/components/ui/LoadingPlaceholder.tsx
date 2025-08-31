import { cn } from '../../utils/cn.ts';

interface LoadingPlaceholderProps {
  className?: string;
  height?: string;
  message?: string;
  variant?: 'default' | 'minimal' | 'editor';
}

export function LoadingPlaceholder({ 
  className, 
  height = 'h-32', 
  message = 'Loading...',
  variant = 'default'
}: LoadingPlaceholderProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'minimal':
        return 'bg-transparent';
      case 'editor':
        return 'bg-gray-100 dark:bg-gray-700 rounded-lg';
      default:
        return 'bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div 
      className={cn(
        'w-full flex items-center justify-center transition-all duration-200',
        height,
        getVariantStyles(),
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Spinner */}
        <div className="relative">
          <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
        
        {/* Loading text */}
        <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          {message}
        </span>
      </div>
    </div>
  );
}

// Specific variants for common use cases
export function EditorLoadingPlaceholder({ className, message = 'Loading editor...' }: Pick<LoadingPlaceholderProps, 'className' | 'message'>) {
  return (
    <LoadingPlaceholder 
      variant="editor" 
      className={className} 
      message={message}
    />
  );
}

export function ModalLoadingPlaceholder({ className, message = 'Loading...' }: Pick<LoadingPlaceholderProps, 'className' | 'message'>) {
  return (
    <LoadingPlaceholder 
      variant="minimal" 
      height="h-auto" 
      className={cn('py-4', className)} 
      message={message}
    />
  );
}
