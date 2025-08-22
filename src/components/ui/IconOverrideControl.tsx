import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn.ts';

interface IconOverrideControlProps {
  value: boolean;
  onChange: (value: boolean) => void;
  emoji?: string;
  className?: string;
}

export function IconOverrideControl({ value, onChange, emoji, className }: IconOverrideControlProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        List Icon Override
      </label>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {value ? (
                <Eye size={16} className="text-green-600 dark:text-green-400" />
              ) : (
                <EyeOff size={16} className="text-gray-400" />
              )}
              <span className="font-medium text-gray-900 dark:text-white">
                Use group icon for all lists
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {value 
                ? "All lists in this group will display the group icon instead of their individual icons"
                : "Lists will display their individual icons as normal"
              }
            </p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              className="sr-only"
            />
            <div 
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors duration-200",
                value 
                  ? "bg-blue-600" 
                  : "bg-gray-300 dark:bg-gray-600"
              )}
            >
              <div 
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200",
                  value ? "translate-x-5" : "translate-x-0"
                )}
              />
            </div>
          </label>
        </div>
        
        {value && !emoji && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              💡 Add a group icon above to see it applied to all lists in this group
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
