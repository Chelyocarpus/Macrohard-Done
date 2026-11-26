import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button.tsx';
import { cn } from '../../utils/cn.ts';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  context?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className={cn(
          'flex flex-col items-center justify-center p-6 text-center',
          'bg-overdue/10 border border-overdue/30 rounded-xl',
          this.props.className
        )}>
          <div className="flex items-center justify-center w-12 h-12 mb-4 bg-overdue/15 rounded-full">
            <AlertTriangle className="w-6 h-6 text-overdue" />
          </div>
          
          <h3 className="text-lg font-semibold text-ink mb-2">
            {this.props.context ? `Failed to load ${this.props.context}` : 'Something went wrong'}
          </h3>
          
          <p className="text-sm text-overdue mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred while loading this component.'}
          </p>

          {this.props.showRetry !== false && (
            <Button
              onClick={this.handleRetry}
              variant="secondary"
              size="sm"
              className="bg-canvas border-overdue/30 hover:bg-overdue/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced wrapper for lazy components with timeout handling
interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  context?: string;
  onRetry?: () => void;
}

// Automatic retries before the error UI (with its manual "Try Again" button) is left in place
const MAX_AUTO_RETRIES = 2;

export function LazyWrapper({ children, fallback, className, context, onRetry }: LazyWrapperProps) {
  const [retryKey, setRetryKey] = React.useState(0);
  const autoRetriesRef = React.useRef(0);
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Don't fire a pending retry after unmount
  React.useEffect(() => () => clearTimeout(retryTimerRef.current), []);

  const handleErrorBoundaryRetry = () => {
    setRetryKey(prev => prev + 1);
    onRetry?.();
  };

  return (
    <ErrorBoundary 
      key={retryKey} // Force remount on retry to reset lazy loading
      className={className} 
      context={context}
      onError={(error) => {
        // Log errors for debugging
        console.error(`Lazy loading error in ${context}:`, error);
        // Retry automatically a limited number of times (with a growing delay); after that the
        // error UI stays visible instead of remounting and failing in an endless loop.
        if (autoRetriesRef.current < MAX_AUTO_RETRIES) {
          autoRetriesRef.current += 1;
          retryTimerRef.current = setTimeout(handleErrorBoundaryRetry, 300 * autoRetriesRef.current);
        }
      }}
    >
      <React.Suspense fallback={fallback}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}
