import { List } from 'lucide-react';
import { getListDisplayInfo } from '../utils/emojiUtils.ts';
import { tagChipColors } from '../utils/tagColors.ts';

/** Every sidebar icon sits in a box this big, in both the labelled and the icon-only sidebar, so they line up. */
export const SIDEBAR_ICON_SIZE = 20;

const box = { width: SIDEBAR_ICON_SIZE, height: SIDEBAR_ICON_SIZE } as const;

/** A list's icon: its emoji, or the plain list symbol when it has none. Same in both sidebars. `icon` is the group's, when it sets one for all its lists. */
export function ListGlyph({ list, icon: groupIcon }: { list: { name: string; emoji?: string }; icon?: string }) {
  const icon = groupIcon ?? getListDisplayInfo(list).icon;
  return (
    <span aria-hidden="true" className="flex flex-shrink-0 items-center justify-center" style={box}>
      {icon ? <span className="text-lg leading-none">{icon}</span> : <List size={SIDEBAR_ICON_SIZE - 2} className="text-muted" />}
    </span>
  );
}

/** A tag's icon: a round chip with a # in the tag's colors. Same in both sidebars. */
export function TagGlyph({ color, darkMode }: { color?: string; darkMode: boolean }) {
  const colors = tagChipColors(color, darkMode);
  return (
    <span
      aria-hidden="true"
      className="flex flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold leading-none"
      style={{ ...box, backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
    >
      #
    </span>
  );
}
