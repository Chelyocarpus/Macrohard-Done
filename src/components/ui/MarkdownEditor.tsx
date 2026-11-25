import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Edit, FileText } from 'lucide-react';
import { cn } from '../../utils/cn.ts';
import { Button } from './Button.tsx';
import { createMarkdownComponents } from './markdownComponents.tsx';

// Roomier styling for the editor preview; created once so component identities stay stable
const EDITOR_COMPONENTS = createMarkdownComponents({
  h1: 'text-xl font-bold mb-3 mt-4 first:mt-0 text-ink',
  h2: 'text-lg font-semibold mb-2 mt-3 first:mt-0 text-ink',
  h3: 'text-base font-medium mb-2 mt-3 first:mt-0 text-ink',
  p: 'mb-3 last:mb-0 leading-relaxed text-ink',
  ul: 'list-disc list-inside mb-3 space-y-1 text-ink',
  ol: 'list-decimal list-inside mb-3 space-y-1 text-ink',
  li: 'leading-relaxed',
  blockquote: 'border-l-0 bg-hover rounded-md px-4 py-2 my-3 italic text-muted',
  inlineCode: 'bg-accent/10 text-accent px-1.5 py-0.5 rounded text-sm font-mono',
  pre: 'bg-hover border border-line rounded-lg p-3 overflow-x-auto my-3 text-sm',
  tableWrapper: 'overflow-x-auto my-3',
  table: 'w-full border-collapse border border-line rounded-lg',
  th: 'bg-hover border border-line px-3 py-2 text-left font-medium text-ink',
  td: 'border border-line px-3 py-2 text-ink',
  hr: 'border-line my-4',
});

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Add a detailed description or note about this task...",
  className,
  disabled = false
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const hasContent = value.trim().length > 0;
  const showPreviewToggle = hasContent || isPreview;

  return (
    <div className={cn("relative", className)}>
      {/* Header with toggle buttons */}
      {showPreviewToggle && (
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-line">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-muted" />
            <span className="text-sm font-medium text-ink">
              Notes
            </span>
          </div>
          <div className="flex items-center gap-1 p-1 bg-hover rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPreview(false)}
              className={cn(
                "px-3 py-1.5 h-auto text-xs rounded-md transition-all",
                !isPreview 
                  ? "bg-canvas text-ink shadow-sm" 
                  : "text-muted hover:text-ink"
              )}
              disabled={disabled}
            >
              <Edit size={14} className="mr-1.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPreview(true)}
              className={cn(
                "px-3 py-1.5 h-auto text-xs rounded-md transition-all",
                isPreview 
                  ? "bg-canvas text-ink shadow-sm" 
                  : "text-muted hover:text-ink"
              )}
              disabled={disabled || !hasContent}
            >
              <Eye size={14} className="mr-1.5" />
              Preview
            </Button>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="relative">
        {isPreview && hasContent ? (
          /* Preview Mode */
          <div 
            className={cn(
              "min-h-[120px] p-4 rounded-xl border bg-canvas border-line",
              "prose prose-sm dark:prose-invert max-w-none",
              "prose-headings:text-ink",
              "prose-p:text-ink",
              "prose-li:text-ink",
              "prose-strong:text-ink",
              "prose-em:text-ink",
              "prose-code:text-accent",
              "prose-code:bg-accent/10",
              "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
              "prose-pre:bg-hover",
              "prose-pre:border prose-pre:border-line",
              "prose-blockquote:text-muted",
              "prose-blockquote:border-l-0",
              "prose-hr:border-line",
              "prose-a:text-accent prose-a:no-underline hover:prose-a:underline",
              "prose-table:text-ink",
              "prose-th:bg-hover",
              "prose-td:border-line",
              "prose-th:border-line"
            )}
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={EDITOR_COMPONENTS}
            >
              {value}
            </ReactMarkdown>
          </div>
        ) : (
          /* Edit Mode */
          <div className="relative">
            <textarea
              value={value}
              onChange={handleTextareaChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "w-full min-h-[120px] p-4 border rounded-xl resize-none transition-all duration-200",
                "placeholder:text-muted",
                "focus:ring-2 focus:ring-accent focus:border-accent",
                isFocused && "border-accent",
                !isFocused && "border-line hover:border-muted",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              rows={4}
            />
            
            {/* Markdown help tooltip */}
            {isFocused && !disabled && (
              <div className="absolute -bottom-8 left-0 text-xs text-muted">
                Supports markdown: **bold**, *italic*, `code`, [links](url), lists, and more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


