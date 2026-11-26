/**
 * The name a screen reader says for a sidebar button: "Inbox, 3 open". Giving the name explicitly (instead of letting it
 * be built from the button's text) keeps the count apart from the name, so "My Day 3" is never read as one odd word.
 * The visible name stays at the start of it, as accessibility rules ask.
 */
export function withCount(name: string, count: number): string {
  return count > 0 ? `${name}, ${count} open` : name;
}
