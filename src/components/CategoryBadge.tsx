import type { Category } from '../types/index.ts';
import { cn } from '../utils/cn.ts';
import { tagChipColors } from '../utils/tagColors.ts';
import { useTaskStore } from '../stores/taskStore.ts';

/**
 * A tag chip: a full-radius pill showing `#name`, tinted with the tag's color. (In the data a tag is
 * still called a "category"; only the wording on screen changed.)
 */
interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md' | 'lg';
  showRemove?: boolean;
  onRemove?: () => void;
  /** Makes the chip a button, e.g. "show only tasks with this tag" */
  onClick?: () => void;
  /** Put the tag's emoji before the name (the manager does; the small chips don't) */
  showEmoji?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function CategoryBadge({
  category,
  size = 'sm',
  showRemove = false,
  onRemove,
  onClick,
  showEmoji = false,
  className,
}: CategoryBadgeProps) {
  const darkMode = useTaskStore((state) => state.darkMode);
  const colors = tagChipColors(category.color, darkMode);

  const label = (
    <>
      {showEmoji && category.emoji && <span className="flex-shrink-0">{category.emoji}</span>}
      <span className="truncate">#{category.name}</span>
    </>
  );

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border font-medium transition-colors',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
    >
      {onClick ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          title={`Show only tasks tagged #${category.name}`}
          aria-label={`Show only tasks tagged #${category.name}`}
          className="inline-flex min-w-0 items-center gap-1 rounded-full hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {label}
        </button>
      ) : (
        label
      )}
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            'flex-shrink-0 rounded-full hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2',
            size === 'sm' ? 'p-0.5' : 'p-1'
          )}
          aria-label={`Remove tag ${category.name}`}
        >
          <svg
            className={cn('text-current', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
