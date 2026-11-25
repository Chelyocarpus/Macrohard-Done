import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../utils/cn.ts';
import { createMarkdownComponents } from './markdownComponents.tsx';
import type { MarkdownElementStyles } from './markdownComponents.tsx';

interface MarkdownDisplayProps {
  content: string;
  className?: string;
  inline?: boolean;
}

// Shared by both variants: only spacing and line height differ between them
const SHARED_STYLES = {
  inlineCode: 'bg-accent/10 text-accent px-1 py-0.5 rounded text-xs font-mono',
  table: 'w-full border-collapse border border-line rounded text-xs',
  th: 'bg-hover border border-line px-2 py-1 text-left font-medium text-ink text-xs',
  td: 'border border-line px-2 py-1 text-muted text-xs',
};

// Compact styles for inline display (task list items)
const INLINE_STYLES: MarkdownElementStyles = {
  ...SHARED_STYLES,
  h1: 'font-bold text-ink text-sm mb-1',
  h2: 'font-semibold text-ink text-sm mb-1',
  h3: 'font-medium text-ink text-sm mb-1',
  p: 'text-muted mb-1 last:mb-0 leading-tight',
  ul: 'list-disc list-inside text-muted mb-1 space-y-0',
  ol: 'list-decimal list-inside text-muted mb-1 space-y-0',
  li: 'leading-tight',
  blockquote: 'border-l-0 bg-hover rounded-md px-3 py-1 italic text-muted my-1',
  pre: 'bg-hover border border-line rounded p-2 overflow-x-auto text-xs my-1',
  tableWrapper: 'overflow-x-auto my-1',
  hr: 'border-line my-1',
};

// Regular spacing for full display
const FULL_STYLES: MarkdownElementStyles = {
  ...SHARED_STYLES,
  h1: 'font-bold text-ink text-lg mb-2 mt-3 first:mt-0',
  h2: 'font-semibold text-ink text-base mb-2 mt-2 first:mt-0',
  h3: 'font-medium text-ink text-sm mb-1 mt-2 first:mt-0',
  p: 'text-muted mb-2 last:mb-0 leading-relaxed',
  ul: 'list-disc list-inside text-muted mb-2 space-y-1',
  ol: 'list-decimal list-inside text-muted mb-2 space-y-1',
  li: 'leading-relaxed',
  blockquote: 'border-l-0 bg-hover rounded-md px-3 py-1 italic text-muted my-2',
  pre: 'bg-hover border border-line rounded p-2 overflow-x-auto text-xs my-2',
  tableWrapper: 'overflow-x-auto my-2',
  hr: 'border-line my-3',
};

// Created once so ReactMarkdown receives stable component identities between renders
const INLINE_COMPONENTS = createMarkdownComponents(INLINE_STYLES);
const FULL_COMPONENTS = createMarkdownComponents(FULL_STYLES);

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
        "prose-headings:text-ink",
        "prose-p:text-ink",
        "prose-li:text-ink",
        "prose-strong:text-ink",
        "prose-em:text-ink",
        "prose-code:text-accent",
        "prose-code:bg-accent/10",
        "prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs",
        "prose-pre:bg-hover",
        "prose-pre:border prose-pre:border-line",
        "prose-blockquote:text-muted",
        "prose-blockquote:border-l-0",
        "prose-hr:border-line",
        "prose-a:text-accent prose-a:no-underline hover:prose-a:underline",
        "prose-table:text-ink",
        "prose-th:bg-hover",
        "prose-td:border-line",
        "prose-th:border-line",
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
        components={inline ? INLINE_COMPONENTS : FULL_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
