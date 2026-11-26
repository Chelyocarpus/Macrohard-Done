import { Sun, Star, Calendar, CheckSquare, Menu, Settings, Keyboard, Tag, Plus, FolderPlus } from 'lucide-react';
import { SidebarRail } from './SidebarRail.tsx';
import { ProfileSwitcher } from './ProfileSwitcher.tsx';
import { isSidebarCollapsed, type LayoutMode } from '../utils/layout.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { useShallow } from 'zustand/react/shallow';
import { useUiStore } from '../stores/uiStore.ts';
import { HOVER_TINT_CLASS, hoverTintStyle, selectionStyle } from '../utils/accentTheme.ts';
import { SidebarSearch } from './SidebarSearch.tsx';
import { TagGlyph, SIDEBAR_ICON_SIZE } from './SidebarGlyphs.tsx';
import { Tooltip } from './ui/Tooltip.tsx';
import { cn } from '../utils/cn.ts';
import { withCount } from '../utils/accessibleNames.ts';
import { GroupedListSection } from './GroupedListSection.tsx';
import { ListEditSidebar } from './ListEditSidebar.tsx';
import { GroupEditSidebar } from './GroupEditSidebar.tsx';
import { CategoryManager } from './CategoryManager.tsx';
import { ListDragOverlay } from './ListDragOverlay.tsx';
import { listCollisionDetection, resolveListDrop } from '../utils/listDnd.ts';
import { UngroupDropTarget } from './UngroupDropTarget.tsx';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';

// Number of categories listed before the "Show more" toggle
const MAX_VISIBLE_CATEGORIES = 5;

/** One full-width row in the sidebar (a view, a tag, Settings): 32px tall, 44px on touch screens, softly rounded */
const ROW_CLASSES = 'w-full flex items-center gap-2 px-3 min-h-8 [@media(pointer:coarse)]:min-h-11 rounded-md text-left text-sm transition-colors';

/** "LISTS" / "TAGS" with the actions for that section at the right */
function SectionHeading({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between pl-3 pr-1 pt-4 pb-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="flex items-center">{actions}</div>
    </div>
  );
}

function HeadingAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip label={label} side="bottom">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="hit-area flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
      >
        {children}
      </button>
    </Tooltip>
  );
}

interface SidebarProps {
  showAddGroupModal: boolean;
  setShowAddGroupModal: (show: boolean) => void;
  showAddListModal: boolean;
  setShowAddListModal: (show: boolean) => void;
  /** Which of the three layouts is showing (see utils/layout.ts) */
  layout?: LayoutMode;
  /** Called whenever a list, tag or view is chosen (on a phone this leaves the Lists screen, even when the choice is the one already open) */
  onNavigate?: () => void;
  /** Phone layout only: whether the Lists screen is the one on show (otherwise it is hidden behind the list) */
  mobileOpen?: boolean;
}

export function Sidebar({
  showAddGroupModal,
  setShowAddGroupModal,
  showAddListModal,
  setShowAddListModal,
  layout = 'wide',
  mobileOpen = false,
  onNavigate,
}: SidebarProps) {
  const isMobile = layout === 'narrow';
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const tagManagerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(tagManagerRef, showCategoryManager);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Selected: only what is used here. `tasks and listGroups` is listed too because the getters below read it; without it a change would not re-render.
  const { lists, currentView, currentListId, currentCategoryId, sidebarCollapsed: storedCollapsed, categories, darkMode, setView: setViewInStore, toggleSidebar, getTaskCountForList, getTaskCountForCategory, getGroupedLists, moveListToGroup, moveListToPosition } = useTaskStore(useShallow((state) => ({ lists: state.lists, currentView: state.currentView, currentListId: state.currentListId, currentCategoryId: state.currentCategoryId, sidebarCollapsed: state.sidebarCollapsed, categories: state.categories, darkMode: state.darkMode, setView: state.setView, toggleSidebar: state.toggleSidebar, getTaskCountForList: state.getTaskCountForList, getTaskCountForCategory: state.getTaskCountForCategory, getGroupedLists: state.getGroupedLists, moveListToGroup: state.moveListToGroup, moveListToPosition: state.moveListToPosition, tasks: state.tasks, listGroups: state.listGroups })));

  const setView: typeof setViewInStore = (...args) => {
    setViewInStore(...args);
    onNavigate?.();
  };

  // Icons only: the person's choice on wide screens, always on medium ones; the phone's Lists screen shows labels
  const sidebarCollapsed = isSidebarCollapsed(layout, storedCollapsed);

  // Back, a shortcut or a link can open a place that is scrolled out of sight in a long sidebar: bring it into view
  // (also when the Lists screen or the wider sidebar has just appeared, which is when it first has a size)
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    asideRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  }, [currentView, currentListId, currentCategoryId, mobileOpen, sidebarCollapsed]);

  // MouseSensor (not PointerSensor) so finger touches only start a drag after press-and-hold,
  // which keeps swipe-to-scroll working in the list.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // Reduced from 8 for more responsive dragging
      },
    }),
    // No keyboard sensor: the list rows are not keyboard stops for dragging any more; "Move up" / "Move down" in a
    // list's menu reorders without a mouse (see GroupedListSection)
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Reduced from 250 for better responsiveness
        tolerance: 8, // Increased for better touch handling
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;
    const activeRect = active.rect.current.translated;
    const action = resolveListDrop({
      activeId: String(active.id),
      overId: String(over.id),
      overData: over.data?.current,
      lists,
      activeCenterY: activeRect ? activeRect.top + activeRect.height / 2 : undefined,
      overCenterY: over.rect.top + over.rect.height / 2,
    });
    if (!action) return;
    if (action.kind === 'group') moveListToGroup(String(active.id), action.groupId);
    else moveListToPosition(String(active.id), action.groupId, action.beforeListId, action.afterListId);
  };

  const handleAddList = () => {
    setShowAddListModal(true);
  };

  const handleAddGroup = () => {
    setShowAddGroupModal(true);
  };

  const systemLists = [
    {
      id: 'my-day',
      name: 'My Day',
      icon: Sun,
      view: 'my-day' as const,
    },
    {
      id: 'important',
      name: 'Important',
      icon: Star,
      view: 'important' as const,
    },
    {
      id: 'planned',
      name: 'Planned',
      icon: Calendar,
      view: 'planned' as const,
    },
    {
      id: 'all',
      name: 'Tasks',
      icon: CheckSquare,
      view: 'all' as const,
    },
  ];

  // Tags shown before "Show more": the first few, and always the open one, so the sidebar says where you are
  const visibleCategories = showAllCategories
    ? categories
    : categories.filter((category, index) => index < MAX_VISIBLE_CATEGORIES || (currentView === 'category' && category.id === currentCategoryId));

  const customLists = lists.filter(list => !list.isSystem);
  const groupedLists = getGroupedLists();

  return (
    <>
      {/* Phone: this is the full-screen "Lists" home screen; it is hidden (not unmounted) while a list is
          showing. No transform is used, because a transform would make every fixed-position panel opened
          from in here (list/group editors) position itself relative to the sidebar instead of the screen.
          `invisible` keeps the hidden links out of the tab order. */}
      {/* A navigation landmark (not "complementary"): its buttons switch between pages, so a screen reader can list it
          among the page's landmarks and jump straight to it. */}
      <nav
        ref={asideRef}
        data-sidebar="true"
        aria-label="Lists and tags"
        className={cn(
          `fixed top-0 h-full bg-sidebar pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`,
          isMobile
            ? cn('left-0 z-[35] w-full', !mobileOpen && 'invisible')
            : cn('left-0 z-20 border-r border-line transition-[width] duration-200', sidebarCollapsed ? 'w-16' : 'w-[260px]')
        )}
      >
      {sidebarCollapsed ? (
        <SidebarRail
          layout={layout}
          onToggleSidebar={toggleSidebar}
          currentView={currentView}
          currentListId={currentListId}
          currentCategoryId={currentCategoryId}
          setView={setView}
          systemViews={systemLists}
          getListCount={getTaskCountForList}
          getTagCount={getTaskCountForCategory}
          categories={categories}
          groupedLists={groupedLists}
          darkMode={darkMode}
          onNewList={handleAddList}
          onNewGroup={handleAddGroup}
          onManageTags={() => setShowCategoryManager(true)}
        />
      ) : (
      <div className="flex flex-col h-full">
        {/* Header: the collapse button sits where the icon-only sidebar has its expand button, then the title */}
        <div className={cn('pb-3 pt-2', layout === 'wide' ? 'px-2.5' : 'px-4 pt-4')}>
          <div className="flex items-center gap-1">
            {/* Only wide screens can choose between labels and icons; the others have a fixed sidebar */}
            {layout === 'wide' && (
              <Tooltip label="Collapse sidebar" side="bottom">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink"
                  aria-label="Collapse sidebar"
                >
                  <Menu size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
                </button>
              </Tooltip>
            )}
            <h1 className="text-xl font-bold text-ink">
              To Do
            </h1>
          </div>
          
          {/* Which profile you are in, always visible; the menu switches it */}
          <div className={cn(layout === 'wide' ? 'mt-1' : 'mt-3')}>
            <ProfileSwitcher variant="sidebar" />
          </div>

          <div className="mt-2">
            {/* A real text field on wide screens (results show beside it); on phones a button to the Search screen */}
            <SidebarSearch live={layout === 'wide'} />
          </div>
        </div>

        {/* Scrolling part: the views, then your lists, then your tags */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-2.5 pb-2 [scrollbar-width:thin]">
          {/* Views */}
          <div className="space-y-0.5 py-1">
            {systemLists.map((listItem) => {
              const Icon = listItem.icon;
              const isActive = currentView === listItem.view;
              const taskCount = getTaskCountForList(listItem.id);

              return (
                <button
                  key={listItem.id}
                  onClick={() => setView(listItem.view)}
                  aria-label={withCount(listItem.name, taskCount)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    ROW_CLASSES,
                    isActive
                      ? 'bg-hover text-ink font-medium shadow-[inset_3px_0_0_rgb(var(--c-accent))]'
                      : 'text-ink hover:bg-hover'
                  )}
                >
                  <Icon size={SIDEBAR_ICON_SIZE} className="flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{listItem.name}</span>
                  {taskCount > 0 && <span aria-hidden="true" className="text-xs tabular-nums text-muted font-normal">{taskCount}</span>}
                </button>
              );
            })}
          </div>

          {/* Lists: "New group" sits in the heading; "New list" is the button pinned under the scrolling part */}
          <SectionHeading
            title="Lists"
            actions={
              <>
                <HeadingAction label="New group" onClick={handleAddGroup}><FolderPlus size={15} aria-hidden="true" /></HeadingAction>
              </>
            }
          />
          {customLists.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No lists yet. Use "New list" below to make one.</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={listCollisionDetection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              {customLists.find((list) => list.id === activeId)?.groupId && <UngroupDropTarget />}
              {groupedLists.map((section) => (
                <GroupedListSection
                  key={section.group?.id || 'ungrouped'}
                  group={section.group}
                  lists={section.lists}
                  currentView={currentView}
                  currentListId={currentListId}
                  onSetView={setView}
                  activeId={activeId}
                />
              ))}
              <ListDragOverlay activeId={activeId} lists={customLists} />
            </DndContext>
          )}

          {/* Tags */}
          <SectionHeading
            title="Tags"
            actions={<HeadingAction label="Manage tags" onClick={() => setShowCategoryManager(true)}><Tag size={15} aria-hidden="true" /></HeadingAction>}
          />
          <div className="space-y-0.5">
            {visibleCategories.map((category) => {
              const taskCount = getTaskCountForCategory(category.id);
              const isActive = currentView === 'category' && currentCategoryId === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => setView('category', undefined, category.id)}
                  aria-label={withCount(`Tag ${category.name}`, taskCount)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    ROW_CLASSES,
                    isActive
                      ? cn('text-ink font-medium', !selectionStyle(category.color) && 'bg-hover shadow-[inset_3px_0_0_rgb(var(--c-accent))]')
                      : cn('text-ink', HOVER_TINT_CLASS)
                  )}
                  style={isActive ? selectionStyle(category.color) : hoverTintStyle(category.color)}
                >
                  <TagGlyph color={category.color} darkMode={darkMode} />
                  <span className="flex-1 truncate">
                    {category.emoji && <span className="mr-1.5">{category.emoji}</span>}
                    {category.name}
                  </span>
                  {taskCount > 0 && <span aria-hidden="true" className="text-xs tabular-nums text-muted font-normal">{taskCount}</span>}
                </button>
              );
            })}

            {categories.length > MAX_VISIBLE_CATEGORIES && (
              <button
                type="button"
                onClick={() => setShowAllCategories(prev => !prev)}
                aria-expanded={showAllCategories}
                className={cn(ROW_CLASSES, 'text-xs text-muted hover:bg-hover')}
              >
                {showAllCategories ? 'Show fewer tags' : `Show ${categories.length - visibleCategories.length} more tag${categories.length - visibleCategories.length === 1 ? '' : 's'}`}
              </button>
            )}

            {categories.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted">No tags yet. Add them in a task's details.</p>
            )}
          </div>
        </div>

        {/* Always in reach, with a text label: the main way to make a list */}
        <div className="border-t border-line px-2.5 pt-2">
          <button
            type="button"
            onClick={handleAddList}
            className={cn(ROW_CLASSES, 'font-medium text-accent hover:bg-hover')}
          >
            <Plus size={SIDEBAR_ICON_SIZE} className="flex-shrink-0" aria-hidden="true" />
            <span>New list</span>
          </button>
        </div>

        {/* Footer: Settings and, for keyboards, the shortcuts list */}
        <div className="flex items-center gap-1 px-2.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => setView('settings')}
            aria-current={currentView === 'settings' ? 'page' : undefined}
            className={cn(
              ROW_CLASSES,
              'flex-1',
              currentView === 'settings' ? 'bg-hover text-ink font-medium shadow-[inset_3px_0_0_rgb(var(--c-accent))]' : 'text-muted hover:bg-hover hover:text-ink'
            )}
          >
            <Settings size={SIDEBAR_ICON_SIZE} className="flex-shrink-0" aria-hidden="true" />
            <span>Settings</span>
          </button>
          {/* Keyboards only: phones and tablets have no shortcuts to look up */}
          <Tooltip label="Keyboard shortcuts" shortcut="?" side="top" className="[@media(hover:none)]:hidden">
            <button
              onClick={() => useUiStore.getState().setHelpOpen(true)}
              aria-label="Keyboard shortcuts"
              aria-keyshortcuts="?"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <Keyboard size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </div>
      )}
    </nav>

      {/* Panels live outside the <nav> so they stay visible when the phone menu slides away */}
      {/* New list and new group open the same kind of side panel */}
      <ListEditSidebar
        isOpen={showAddListModal}
        onClose={() => setShowAddListModal(false)}
        mode="create"
      />
      <GroupEditSidebar
        isOpen={showAddGroupModal}
        onClose={() => setShowAddGroupModal(false)}
        mode="create"
      />

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div ref={tagManagerRef} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 sm:p-4 z-50" role="dialog" aria-modal="true" aria-label="Manage tags">
          {/* Phones: fills the whole screen; larger screens: centred 80%-height card */}
          <div className="sm:max-w-2xl w-full h-full sm:h-[80vh] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:py-0 bg-canvas sm:bg-transparent sm:dark:bg-transparent">
            <CategoryManager
              onClose={() => setShowCategoryManager(false)}
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </>
  );
}
