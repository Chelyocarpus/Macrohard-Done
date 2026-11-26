import React from 'react';
import { cn } from '../../utils/cn.ts';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink ring-offset-canvas file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-overdue focus-visible:ring-overdue',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-overdue">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
