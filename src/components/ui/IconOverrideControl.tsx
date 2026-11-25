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
      <label className="text-sm font-medium text-ink">
        List Icon Override
      </label>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 border border-line rounded-lg bg-canvas">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {value ? (
                <Eye size={16} className="text-done" />
              ) : (
                <EyeOff size={16} className="text-muted" />
              )}
              <span className="font-medium text-ink">
                Use group icon for all lists
              </span>
            </div>
            <p className="text-sm text-muted mt-1">
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
                  ? "bg-accent" 
                  : "bg-muted/40"
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
          <div className="p-3 bg-important/10 border border-important/30 rounded-lg">
            <p className="text-sm text-ink">
              💡 Add a group icon above to see it applied to all lists in this group
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
