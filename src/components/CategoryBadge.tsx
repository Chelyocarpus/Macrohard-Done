import type { Category } from '../types/index.ts';
import { cn } from '../utils/cn.ts';

interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'subtle';
  showRemove?: boolean;
  onRemove?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

const variantClasses = {
  default: 'text-white',
  outline: 'border-2 bg-transparent',
  subtle: 'bg-opacity-10 border border-current',
};

export function CategoryBadge({ 
  category, 
  size = 'sm', 
  variant = 'default',
  showRemove = false,
  onRemove,
  className 
}: CategoryBadgeProps) {
  const bgColor = category.color || '#6b7280'; // Default gray if no color
  
  const badgeStyle = variant === 'default' 
    ? { backgroundColor: bgColor }
    : { 
        borderColor: bgColor, 
        color: bgColor,
        backgroundColor: variant === 'subtle' ? `${bgColor}1a` : 'transparent'
      };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      style={badgeStyle}
    >
      {category.emoji && (
        <span className="flex-shrink-0">
          {category.emoji}
        </span>
      )}
      <span className="truncate">
        {category.name}
      </span>
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            'flex-shrink-0 rounded-full hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current',
            size === 'sm' ? 'p-0.5' : 'p-1'
          )}
          aria-label={`Remove ${category.name} category`}
        >
          <svg
            className={cn(
              'text-current',
              size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
