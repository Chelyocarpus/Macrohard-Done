import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Edit, FileText } from 'lucide-react';
import { cn } from '../../utils/cn.ts';
import { Button } from './Button.tsx';

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
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes
            </span>
          </div>
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPreview(false)}
              className={cn(
                "px-3 py-1.5 h-auto text-xs rounded-md transition-all",
                !isPreview 
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
              "min-h-[120px] p-4 rounded-xl border bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-600",
              "prose prose-sm dark:prose-invert max-w-none",
              "prose-headings:text-gray-900 dark:prose-headings:text-gray-100",
              "prose-p:text-gray-700 dark:prose-p:text-gray-300",
              "prose-li:text-gray-700 dark:prose-li:text-gray-300",
              "prose-strong:text-gray-900 dark:prose-strong:text-gray-100",
              "prose-em:text-gray-700 dark:prose-em:text-gray-300",
              "prose-code:text-blue-600 dark:prose-code:text-blue-400",
              "prose-code:bg-blue-50 dark:prose-code:bg-blue-900/20",
              "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
              "prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800",
              "prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700",
              "prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400",
              "prose-blockquote:border-l-blue-500 dark:prose-blockquote:border-l-blue-400",
              "prose-hr:border-gray-200 dark:prose-hr:border-gray-700",
              "prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline",
              "prose-table:text-gray-700 dark:prose-table:text-gray-300",
              "prose-th:bg-gray-100 dark:prose-th:bg-gray-800",
              "prose-td:border-gray-200 dark:prose-td:border-gray-700",
              "prose-th:border-gray-200 dark:prose-th:border-gray-700"
            )}
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom components for better styling
                h1: ({ children, ...props }) => (
                  <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-gray-900 dark:text-gray-100" {...props}>
                    {children}
                  </h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0 text-gray-900 dark:text-gray-100" {...props}>
                    {children}
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 className="text-base font-medium mb-2 mt-3 first:mt-0 text-gray-900 dark:text-gray-100" {...props}>
                    {children}
                  </h3>
                ),
                p: ({ children, ...props }) => (
                  <p className="mb-3 last:mb-0 leading-relaxed text-gray-700 dark:text-gray-300" {...props}>
                    {children}
                  </p>
                ),
                ul: ({ children, ...props }) => (
                  <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300" {...props}>
                    {children}
                  </ul>
                ),
                ol: ({ children, ...props }) => (
                  <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300" {...props}>
                    {children}
                  </ol>
                ),
                li: ({ children, ...props }) => (
                  <li className="leading-relaxed" {...props}>
                    {children}
                  </li>
                ),
                blockquote: ({ children, ...props }) => (
                  <blockquote className="border-l-4 border-l-blue-500 dark:border-l-blue-400 pl-4 my-3 italic text-gray-600 dark:text-gray-400" {...props}>
                    {children}
                  </blockquote>
                ),
                code: ({ children, className, ...props }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children, ...props }) => (
                  <pre className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto my-3 text-sm" {...props}>
                    {children}
                  </pre>
                ),
                table: ({ children, ...props }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg" {...props}>
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children, ...props }) => (
                  <th className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100" {...props}>
                    {children}
                  </th>
                ),
                td: ({ children, ...props }) => (
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300" {...props}>
                    {children}
                  </td>
                ),
                a: ({ children, href, ...props }) => (
                  <a 
                    href={href} 
                    className="text-blue-600 dark:text-blue-400 hover:underline" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    {...props}
                  >
                    {children}
                  </a>
                ),
                hr: ({ ...props }) => (
                  <hr className="border-gray-200 dark:border-gray-700 my-4" {...props} />
                ),
              }}
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
                "dark:bg-gray-900/50 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                isFocused && "border-blue-300 dark:border-blue-600",
                !isFocused && "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              rows={4}
            />
            
            {/* Markdown help tooltip */}
            {isFocused && !disabled && (
              <div className="absolute -bottom-8 left-0 text-xs text-gray-500 dark:text-gray-400">
                Supports markdown: **bold**, *italic*, `code`, [links](url), lists, and more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


