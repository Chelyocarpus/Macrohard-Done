import type { NewTaskOptions } from '../stores/task/types.ts';
import { getNewTaskDefaults } from './newTaskDefaults.ts';
import { parseTitleDate } from './titleDate.ts';

/**
 * Quick-add syntax: what can be typed into the title of a new task, on top of the date words handled by `titleDate.ts`.
 *
 *   Ship invoice #work ! friday @Clients
 *   |            |    | |      |
 *   |            |    | |      the list the task goes to (`@list`)
 *   |            |    | the due date (the last words)
 *   |            |    important (a `!` on its own)
 *   |            the tag (`#tag`)
 *   the title that is left
 *
 * Names are matched without capitals, spaces and punctuation ("#deepwork" and "#Deep-Work" both find "Deep Work"), and
 * a short start is enough while it is unambiguous ("#wo" finds "Work" when no other tag starts with "wo").
 *
 * Robustness / pitfalls guarded against:
 * - A tag or list that does not exist is NOT made up and NOT dropped: the words stay in the title ("Fix bug #123",
 *   "Mail bob @ noon"), and the caller is told which ones were left, so a typo like "#wrok" is noticed instead of
 *   silently ending up as text.
 * - Words glued to a symbol are ordinary text ("Great!", "bob@mail.com"): only a word that STARTS with # or @, or is
 *   a lone "!", counts.
 * - A title that would be empty after taking the symbols out ("#work", "!") is kept as typed, so a task is never
 *   created without a title, and nothing the person typed is lost.
 * - Only the user's own lists can be named (and the default "Tasks"): the smart views (My Day, Important, Planned) are
 *   filters, not places to store a task.
 * - Two lists named in one title: the first wins, the other stays in the title and is reported as left.
 */

export interface NamedItem {
  id: string;
  name: string;
}

export interface QuickAddList extends NamedItem {
  isSystem?: boolean;
}

export interface ParsedQuickAdd {
  /** The title without the symbols and the date words */
  title: string;
  important: boolean;
  /** Ids of the tags that were named, each once */
  tagIds: string[];
  tagNames: string[];
  /** The list that was named with @, if any */
  listId?: string;
  listName?: string;
  dueDate?: Date;
  /** The `#x` / `@x` words that were not used and stay in the title */
  unmatched: string[];
  /** True when anything was taken out of the title */
  recognised: boolean;
}

/** "Deep Work", "deep-work" and "#deepwork" all become "deepwork" */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/** The one item the typed name stands for: a full match first, else a short start that only one item has */
export function matchName<T extends NamedItem>(items: readonly T[], typed: string): T | null {
  const wanted = normalizeName(typed);
  if (!wanted) return null;
  const exact = items.filter((item) => normalizeName(item.name) === wanted);
  if (exact.length > 0) return exact[0];
  const starts = items.filter((item) => normalizeName(item.name).startsWith(wanted));
  return starts.length === 1 ? starts[0] : null;
}

/** The name after the # or @, without punctuation that belongs to the sentence ("#work," -> "work") */
function symbolName(word: string): string {
  return word.slice(1).replace(/[.,;:!?)\]]+$/, '');
}

export function parseQuickAdd(
  text: string,
  context: { categories: readonly NamedItem[]; lists: readonly QuickAddList[]; now?: Date },
): ParsedQuickAdd {
  const plain = (title: string): ParsedQuickAdd => ({ title, important: false, tagIds: [], tagNames: [], unmatched: [], recognised: false });
  const trimmed = text.trim();
  if (!trimmed) return plain(trimmed);

  const targets = context.lists.filter((list) => !list.isSystem || list.id === 'all');
  const kept: string[] = [];
  const unmatched: string[] = [];
  const tagIds: string[] = [];
  const tagNames: string[] = [];
  let important = false;
  let list: QuickAddList | undefined;
  let removed = 0;

  for (const word of trimmed.split(/\s+/)) {
    if (word === '!') {
      important = true;
      removed++;
      continue;
    }
    if (word.length > 1 && (word[0] === '#' || word[0] === '@')) {
      const name = symbolName(word);
      if (name && name[0] !== '#' && name[0] !== '@') {
        if (word[0] === '#') {
          const tag = matchName(context.categories, name);
          if (tag) {
            if (!tagIds.includes(tag.id)) {
              tagIds.push(tag.id);
              tagNames.push(tag.name);
            }
            removed++;
            continue;
          }
        } else {
          const found = matchName(targets, name);
          if (found && !list) {
            list = found;
            removed++;
            continue;
          }
        }
        // "#123" is far more likely a number than a tag that was mistyped, so it is not reported
        if (!/^\d+$/.test(name) || word[0] === '@') unmatched.push(word);
      }
    }
    kept.push(word);
  }

  // Nothing taken out, or nothing left of the title: the text is used exactly as typed
  const rest = kept.join(' ');
  if (removed === 0 || !rest) {
    const found = parseTitleDate(trimmed, context.now);
    return found
      ? { ...plain(found.title), dueDate: found.dueDate, unmatched, recognised: true }
      : { ...plain(trimmed), unmatched };
  }

  const dated = parseTitleDate(rest, context.now);
  return {
    title: dated ? dated.title : rest,
    important,
    tagIds,
    tagNames,
    listId: list?.id,
    listName: list?.name,
    dueDate: dated?.dueDate,
    unmatched,
    recognised: true,
  };
}

export interface QuickAddPlan {
  title: string;
  listId: string;
  options: NewTaskOptions;
  parsed: ParsedQuickAdd;
}

/**
 * Everything a new task is created with: what the current view needs (its list or tag, My Day, Important, due today in
 * Planned) combined with what was typed. Typed things win where they conflict (a due date, a list); tags are added to
 * the view's own tag.
 */
export function planQuickAdd(
  text: string,
  context: {
    view: string;
    currentListId?: string;
    currentCategoryId?: string;
    categories: readonly NamedItem[];
    lists: readonly QuickAddList[];
    now?: Date;
  },
): QuickAddPlan {
  const { listId: viewListId, ...defaults } = getNewTaskDefaults(context.view, context.currentListId, context.currentCategoryId);
  const parsed = parseQuickAdd(text, context);
  const categoryIds = Array.from(new Set([...(defaults.categoryIds ?? []), ...parsed.tagIds]));
  return {
    title: parsed.title,
    listId: parsed.listId ?? viewListId,
    options: {
      ...defaults,
      ...(parsed.important ? { important: true } : {}),
      ...(parsed.dueDate ? { dueDate: parsed.dueDate } : {}),
      ...(categoryIds.length > 0 ? { categoryIds } : {}),
    },
    parsed,
  };
}
