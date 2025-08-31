import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn.ts';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  color?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
  onClick?: () => void;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  subtitle, 
  color,
  trend, 
  className,
  onClick 
}: StatCardProps) {
  return (
    <div 
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700',
        'hover:shadow-md hover:scale-[1.02] transition-all duration-200',
        'flex flex-col gap-2',
        onClick && 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-2 rounded-lg',
            color 
              ? 'text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          )} style={color ? { backgroundColor: color } : {}}>
            <Icon size={16} />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </span>
        </div>
        {trend && (
          <div className={cn(
            'text-xs px-2 py-1 rounded-full',
            trend.direction === 'up' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            trend.direction === 'down' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            trend.direction === 'neutral' && 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
          )}>
            {trend.direction === 'up' && '+'}
            {trend.value} {trend.label}
          </div>
        )}
      </div>
      
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </span>
        {subtitle && (
          <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
