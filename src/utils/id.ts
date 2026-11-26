import { v4 as uuidv4 } from 'uuid';

/**
 * The one place new ids are made, for tasks, steps, lists, groups, tags, profiles and toasts alike.
 *
 * A random UUID (v4) comes from the browser's secure random source, so two devices that sync the same account
 * can't hand out the same id, which the old `Date.now()` plus `Math.random()` text could not promise.
 * Ids saved before this change keep their old shape and still work: nothing checks an id's format except the
 * profile id rule (`[A-Za-z0-9_-]{1,64}`), and a UUID is 36 characters of letters, digits and hyphens.
 */
export function generateId(): string {
  return uuidv4();
}
