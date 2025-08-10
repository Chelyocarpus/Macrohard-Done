/**
 * Utility functions for handling emojis in text
 */

// Regex to match emojis (including skin tone modifiers and compound emojis)
const emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;

/**
 * Extracts the first emoji from a string
 * @param text - The text to extract emoji from
 * @returns The first emoji found, or null if none found
 */
export function extractFirstEmoji(text: string): string | null {
  const match = text.match(emojiRegex);
  return match ? match[0] : null;
}

/**
 * Removes the first emoji from a string and trims whitespace
 * @param text - The text to remove emoji from
 * @returns The text without the first emoji
 */
export function removeFirstEmoji(text: string): string {
  const firstEmoji = extractFirstEmoji(text);
  if (!firstEmoji) return text;
  
  const index = text.indexOf(firstEmoji);
  const withoutEmoji = text.slice(0, index) + text.slice(index + firstEmoji.length);
  return withoutEmoji.trim();
}

/**
 * Gets the display name and icon for a list
 * @param list - The list object
 * @returns Object with displayName and icon
 */
export function getListDisplayInfo(list: { name: string; emoji?: string }) {
  // If list already has an explicit emoji, use that
  if (list.emoji) {
    return {
      displayName: list.name,
      icon: list.emoji
    };
  }
  
  // Extract first emoji from name
  const extractedEmoji = extractFirstEmoji(list.name);
  if (extractedEmoji) {
    return {
      displayName: removeFirstEmoji(list.name),
      icon: extractedEmoji
    };
  }
  
  // No emoji found
  return {
    displayName: list.name,
    icon: null
  };
}
