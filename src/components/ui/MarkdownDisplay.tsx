import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../utils/cn.ts';

interface MarkdownDisplayProps {
  content: string;
  className?: string;
  inline?: boolean;
}

export function MarkdownDisplay({ 
  content, 
  className,
  inline = false 
}: MarkdownDisplayProps) {
  if (!content.trim()) return null;

  return (
    <div 
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:text-gray-900 dark:prose-headings:text-gray-100",
        "prose-p:text-gray-600 dark:prose-p:text-gray-300",
        "prose-li:text-gray-600 dark:prose-li:text-gray-300",
        "prose-strong:text-gray-900 dark:prose-strong:text-gray-100",
        "prose-em:text-gray-600 dark:prose-em:text-gray-300",
        "prose-code:text-blue-600 dark:prose-code:text-blue-400",
        "prose-code:bg-blue-50 dark:prose-code:bg-blue-900/20",
        "prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs",
        "prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800",
        "prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700",
        "prose-blockquote:text-gray-500 dark:prose-blockquote:text-gray-400",
        "prose-blockquote:border-l-blue-500 dark:prose-blockquote:border-l-blue-400",
        "prose-hr:border-gray-200 dark:prose-hr:border-gray-700",
        "prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline",
        "prose-table:text-gray-600 dark:prose-table:text-gray-300",
        "prose-th:bg-gray-100 dark:prose-th:bg-gray-800",
        "prose-td:border-gray-200 dark:prose-td:border-gray-700",
        "prose-th:border-gray-200 dark:prose-th:border-gray-700",
        // Compact styles for inline display
        inline && [
          "prose-p:my-0 prose-p:leading-tight",
          "prose-headings:my-0 prose-headings:leading-tight",
          "prose-ul:my-0 prose-ol:my-0 prose-li:my-0",
          "prose-blockquote:my-0"
        ],
        className
      )}
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom components for compact styling in task items
          h1: ({ children, ...props }) => (
            <h1 className={cn(
              "font-bold text-gray-900 dark:text-gray-100",
              inline ? "text-sm mb-1" : "text-lg mb-2 mt-3 first:mt-0"
            )} {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className={cn(
              "font-semibold text-gray-900 dark:text-gray-100",
              inline ? "text-sm mb-1" : "text-base mb-2 mt-2 first:mt-0"
            )} {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className={cn(
              "font-medium text-gray-900 dark:text-gray-100",
              inline ? "text-sm mb-1" : "text-sm mb-1 mt-2 first:mt-0"
            )} {...props}>
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <p className={cn(
              "text-gray-600 dark:text-gray-300",
              inline ? "mb-1 last:mb-0 leading-tight" : "mb-2 last:mb-0 leading-relaxed"
            )} {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className={cn(
              "list-disc list-inside text-gray-600 dark:text-gray-300",
              inline ? "mb-1 space-y-0" : "mb-2 space-y-1"
            )} {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className={cn(
              "list-decimal list-inside text-gray-600 dark:text-gray-300",
              inline ? "mb-1 space-y-0" : "mb-2 space-y-1"
            )} {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className={cn(
              inline ? "leading-tight" : "leading-relaxed"
            )} {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className={cn(
              "border-l-4 border-l-blue-500 dark:border-l-blue-400 pl-3 italic text-gray-500 dark:text-gray-400",
              inline ? "my-1" : "my-2"
            )} {...props}>
              {children}
            </blockquote>
          ),
          code: ({ children, className, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded text-xs font-mono" {...props}>
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
            <pre className={cn(
              "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-x-auto text-xs",
              inline ? "my-1" : "my-2"
            )} {...props}>
              {children}
            </pre>
          ),
          table: ({ children, ...props }) => (
            <div className={cn("overflow-x-auto", inline ? "my-1" : "my-2")}>
              <table className="w-full border-collapse border border-gray-200 dark:border-gray-700 rounded text-xs" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 text-left font-medium text-gray-900 dark:text-gray-100 text-xs" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-gray-600 dark:text-gray-300 text-xs" {...props}>
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
            <hr className={cn(
              "border-gray-200 dark:border-gray-700",
              inline ? "my-1" : "my-3"
            )} {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
