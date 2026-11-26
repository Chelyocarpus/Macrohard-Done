import type { ComponentType, ReactNode } from 'react';
import { Search, Menu, Tag, Plus, FolderPlus, Settings, Keyboard, MoreHorizontal } from 'lucide-react';
import { Tooltip } from './ui/Tooltip.tsx';
import { ProfileSwitcher } from './ProfileSwitcher.tsx';
import { cn } from '../utils/cn.ts';
import { withCount } from '../utils/accessibleNames.ts';
import { getListDisplayInfo, groupIconOverride } from '../utils/emojiUtils.ts';
import { ListGlyph, TagGlyph, SIDEBAR_ICON_SIZE } from './SidebarGlyphs.tsx';
import { HOVER_TINT_CLASS, hoverTintStyle, selectionStyle } from '../utils/accentTheme.ts';
import { FOCUS_SEARCH_EVENT } from '../hooks/useKeyboardShortcuts.ts';
import { useUiStore } from '../stores/uiStore.ts';
import type { Category, ListGroup, TaskList, ViewType } from '../types/index.ts';
import type { LayoutMode } from '../utils/layout.ts';

/** Tags shown one by one before the rest are behind "more" (same number as the labelled sidebar) */
const MAX_VISIBLE_TAGS = 5;

interface RailItemProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  /** Open-task count, drawn as a small badge on the icon */
  badge?: number;
  shortcut?: string;
  ariaKeyShortcuts?: string;
  /** The item's own colour (a list or tag): tints it and colours the bar when it is the open place */
  color?: string;
  /** Hidden on touch screens, where there is no keyboard to use the shortcut with */
  hideOnTouch?: boolean;
  children: ReactNode;
}

/**
 * One 44px button in the icon-only sidebar: centred icon, optional count badge, a blue bar on the left edge
 * when it is the open place, and a tooltip with the full name (the only label there is).
 */
function RailItem({ label, onClick, active = false, badge = 0, shortcut, ariaKeyShortcuts, color, hideOnTouch = false, children }: RailItemProps) {
  const own = active ? selectionStyle(color) : undefined;
  return (
    <Tooltip label={label} shortcut={shortcut} side="right" className={cn('relative w-full justify-center', hideOnTouch && '[@media(hover:none)]:hidden')}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        aria-keyshortcuts={ariaKeyShortcuts}
        className={cn(
          'relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors',
          active ? cn('text-ink', !own && 'bg-hover') : cn('text-muted hover:text-ink', HOVER_TINT_CLASS)
        )}
        style={own ? { backgroundColor: own.backgroundColor } : hoverTintStyle(color)}
      >
        {active && <span aria-hidden="true" className={cn('pointer-events-none absolute -left-[10px] top-2 bottom-2 w-[3px] rounded-r-full', !own && 'bg-accent')} style={own ? { backgroundColor: color } : undefined} />}
        {!active && color && <span aria-hidden="true" className="pointer-events-none absolute left-0.5 top-2.5 bottom-2.5 w-0.5 rounded-full" style={{ backgroundColor: color }} />}
        {children}
        {badge > 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sidebar px-1 text-[0.625rem] font-semibold leading-none text-ink ring-1 ring-line"
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

const Divider = () => <div aria-hidden="true" className="mx-4 my-1.5 h-px bg-line" />;

/** "My Day, 3 open" */

interface SidebarRailProps {
  layout: LayoutMode;
  onToggleSidebar: () => void;
  currentView: ViewType;
  currentListId?: string;
  currentCategoryId?: string;
  setView: (view: ViewType, listId?: string, categoryId?: string) => void;
  systemViews: { id: string; name: string; icon: ComponentType<{ size?: number; className?: string }>; view: ViewType }[];
  getListCount: (id: string) => number;
  getTagCount: (id: string) => number;
  categories: Category[];
  groupedLists: { group: ListGroup | null; lists: TaskList[] }[];
  darkMode: boolean;
  onNewList: () => void;
  onNewGroup: () => void;
  onManageTags: () => void;
}

/**
 * The sidebar when it shows only icons (wide screens when collapsed, and always on medium ones).
 *
 * Everything the full sidebar offers is reachable here, in the SAME order and with the SAME icons: Search, the four views,
 * New group and the lists (grouped, with thin dividers between groups), Manage tags and the tags, then New list, Settings
 * and the keyboard shortcuts. Icons are 20px and centred 32px from the left edge, exactly where the labelled sidebar puts them. Counts are badges, names
 * are tooltips (and the buttons' accessible names), and every button is 44px so it is easy to hit.
 */
export function SidebarRail({
  layout, onToggleSidebar, currentView, currentListId, currentCategoryId, setView, systemViews, getListCount, getTagCount,
  categories, groupedLists, darkMode, onNewList, onNewGroup, onManageTags,
}: SidebarRailProps) {
  // The first few tags, and always the open one, so the rail says where you are
  const visibleTags = categories.filter((category, index) => index < MAX_VISIBLE_TAGS || (currentView === 'category' && category.id === currentCategoryId));
  const hiddenTags = categories.length - visibleTags.length;
  const sections = groupedLists.filter((section) => section.lists.length > 0);

  return (
    <div className="flex h-full flex-col">
      {/* Top: expand (wide screens only) and search */}
      <div className="flex flex-col items-center gap-1 border-b border-line px-2.5 py-2">
        {layout === 'wide' && (
          <RailItem label="Expand sidebar" onClick={onToggleSidebar}>
            <Menu size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
          </RailItem>
        )}
        {/* Which profile you are in: the same place as in the labelled sidebar, between the menu button and Search */}
        <ProfileSwitcher variant="rail" />
        <RailItem
          label="Search"
          shortcut="F"
          ariaKeyShortcuts="f Control+F Meta+F"
          active={currentView === 'search'}
          onClick={() => window.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT))}
        >
          <Search size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
        </RailItem>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden px-2.5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* The four views */}
        {systemViews.map((item) => {
          const Icon = item.icon;
          const count = getListCount(item.id);
          return (
            <RailItem key={item.id} label={withCount(item.name, count)} badge={count} active={currentView === item.view} onClick={() => setView(item.view)}>
              <Icon size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
            </RailItem>
          );
        })}

        {/* Lists, in the same place as in the labelled sidebar: "New group" first (it is in the Lists heading there),
            then the lists with a thin line between groups */}
        <Divider />
        <RailItem label="New group" onClick={onNewGroup}>
          <FolderPlus size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
        </RailItem>
        {sections.map((section, sectionIndex) => (
          <div key={section.group?.id ?? 'ungrouped'} className="flex w-full flex-col items-center gap-1" role="group" aria-label={section.group ? `Group ${section.group.name}` : 'Lists'}>
            {sectionIndex > 0 && <Divider />}
            {section.lists.map((list) => {
              const { displayName } = getListDisplayInfo(list);
              const count = getListCount(list.id);
              const active = currentView === 'list' && currentListId === list.id;
              return (
                <RailItem key={list.id} label={withCount(displayName, count)} badge={count} active={active} color={list.color} onClick={() => setView('list', list.id)}>
                  <ListGlyph list={list} icon={groupIconOverride(section.group)} />
                </RailItem>
              );
            })}
          </div>
        ))}

        {/* Tags, after the lists like in the labelled sidebar: "Manage tags" first (it is in the Tags heading there) */}
        <Divider />
        <RailItem label="Manage tags" onClick={onManageTags}>
          <Tag size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
        </RailItem>
        {visibleTags.map((category) => {
          const count = getTagCount(category.id);
          const active = currentView === 'category' && currentCategoryId === category.id;
          return (
            <RailItem key={category.id} label={withCount(`#${category.name}`, count)} badge={count} active={active} color={category.color} onClick={() => setView('category', undefined, category.id)}>
              <TagGlyph color={category.color} darkMode={darkMode} />
            </RailItem>
          );
        })}
        {hiddenTags > 0 && (
          <RailItem label={`${hiddenTags} more tag${hiddenTags === 1 ? '' : 's'}`} onClick={onManageTags}>
            <MoreHorizontal size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
          </RailItem>
        )}
      </div>

      {/* Bottom: create, settings, shortcuts */}
      <div className="flex flex-col items-center gap-1 border-t border-line px-2.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <RailItem label="New list" onClick={onNewList}>
          <Plus size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
        </RailItem>
        <RailItem label="Settings" active={currentView === 'settings'} onClick={() => setView('settings')}>
          <Settings size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
        </RailItem>
        <RailItem label="Keyboard shortcuts" shortcut="?" ariaKeyShortcuts="?" hideOnTouch onClick={() => useUiStore.getState().setHelpOpen(true)}>
          <Keyboard size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
        </RailItem>
      </div>
    </div>
  );
}
