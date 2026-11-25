import type { Components } from 'react-markdown';

/**
 * Class names for each markdown element. Different surfaces (compact task notes vs. the roomier
 * editor preview) supply their own sizes and spacing; the element structure and the link/code
 * handling below are shared.
 */
export interface MarkdownElementStyles {
  h1: string;
  h2: string;
  h3: string;
  p: string;
  ul: string;
  ol: string;
  li: string;
  blockquote: string;
  inlineCode: string;
  pre: string;
  tableWrapper: string;
  table: string;
  th: string;
  td: string;
  hr: string;
}

const LINK_CLASS = 'text-accent hover:underline';

/**
 * Build the react-markdown component overrides for a set of element styles.
 *
 * Safety notes: no raw-HTML plugin is used by the callers, and links open in a new tab with
 * `rel="noopener noreferrer"`.
 */
export function createMarkdownComponents(styles: MarkdownElementStyles): Components {
  return {
    h1: ({ children, ...props }) => (
      <h1 className={styles.h1} {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className={styles.h2} {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className={styles.h3} {...props}>{children}</h3>
    ),
    p: ({ children, ...props }) => (
      <p className={styles.p} {...props}>{children}</p>
    ),
    ul: ({ children, ...props }) => (
      <ul className={styles.ul} {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className={styles.ol} {...props}>{children}</ol>
    ),
    li: ({ children, ...props }) => (
      <li className={styles.li} {...props}>{children}</li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote className={styles.blockquote} {...props}>{children}</blockquote>
    ),
    code: ({ children, className, ...props }) => {
      // Fenced blocks arrive with a language class; plain backtick code does not
      if (!className) {
        return (
          <code className={styles.inlineCode} {...props}>{children}</code>
        );
      }
      return (
        <code className={className} {...props}>{children}</code>
      );
    },
    pre: ({ children, ...props }) => (
      <pre className={styles.pre} {...props}>{children}</pre>
    ),
    table: ({ children, ...props }) => (
      <div className={styles.tableWrapper}>
        <table className={styles.table} {...props}>{children}</table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th className={styles.th} {...props}>{children}</th>
    ),
    td: ({ children, ...props }) => (
      <td className={styles.td} {...props}>{children}</td>
    ),
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        className={LINK_CLASS}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
    hr: ({ ...props }) => (
      <hr className={styles.hr} {...props} />
    ),
  };
}
