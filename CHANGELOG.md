# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2026-11-26

### Added
- Settings > Date and time lets you choose how dates and times are written: Mon D, YYYY (the old way), D Mon YYYY, YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY or DD.MM.YYYY, and a 12-hour or 24-hour clock. Each choice shows an example. It applies everywhere: task cards, the task details, the date picker and its time presets, reminder messages and the "Next one" message for repeating tasks. "Today", "Tomorrow" and weekday names stay as they are. The choice is remembered on this device for all profiles, and several open tabs stay in step.
- Type a day at the end of a new task and it becomes the due date: "Call Mom tomorrow" is added as "Call Mom", due tomorrow. It understands today, tomorrow, weekdays (also "by friday" and "next friday"), "next week" and "in 3 days" or "in 2 weeks". The add bar shows an example.
- Settings > Appearance has a Text size choice (Standard, Large or Extra large, 25% or 50% bigger) that makes all text, buttons and icons larger. It is remembered on this device.
- Settings > Appearance also has "How long messages stay": normal, 30 seconds, or until you close them.
- The add bar understands more than a day now: `#work` adds a tag, `@Clients` puts the task in that list, and a lone `!` makes it important. "Ship invoice #work ! friday @Clients" does all of it. A tag or list that doesn't exist stays in the title and a message tells you. The Quick Add window shows what it understood before you add.
- You can select several tasks: Ctrl+click (or Select in a task's "more" menu on a phone), Shift+click or Shift+Up/Down for a range, X for the current one, Ctrl+A for all. A bar at the bottom completes, stars, adds to My Day, sets a due date, tags, moves or deletes them all at once, with one Undo. Space, S, M, P and Delete work on the whole selection, and Esc clears it.

### Changed
- The star, sun, pin and "more" buttons on a task are always visible (they used to appear only for the selected or hovered task), so the list no longer changes as you move through it with the arrow keys. On phones the sun and pin still show only when set.
- After deleting or completing a task with the keyboard, the selection stays with the open tasks. Deleting the last open task no longer jumps into the Completed list.
- Messages stay longer: 8 seconds, 10 for errors and 15 for a message with an Undo button (it was 6). A message also waits while you hold a finger on it or have it selected with the keyboard, not just while the mouse is over it.
- The Undo button and the X on messages are bigger and easier to hit. On a touch screen the check circle, the X buttons, the step circles and the group buttons all have a 44 px tap area, with more room between the star, sun, pin and "more" buttons on a task. The check circle is a little bigger, and the small boxes for steps on a task card are bigger and can be ticked by tapping the step's words.
- On a phone, a message no longer covers the Duplicate, Pin, Complete and Move buttons in the task details; it moves up above them.
- On a touch screen, a task no longer stays highlighted after you tap it (the highlight and the "hover" look were meant for a mouse and keyboard). A task whose details are open still shows as selected.
- The empty My Day page now explains what My Day is and how to add tasks to it. Important and Planned explain themselves too.
- The profile in the sidebar is explained (a separate set of lists and tasks, such as Personal and Work) and stays plain until you have a second profile.
- In My Day the sun on each task is no longer blue; it shows when you point at the task, like the other buttons.
- The message after adding a task now says where it went and what it started with ("Added to Groceries", "Due tomorrow"), instead of repeating the title.
- The Settings text about sync no longer points to the README.
- The message after adding a task to My Day with its sun button no longer has an emoji.
- On a phone, the "Add a task" bar is now a round plus button in the bottom right corner. Tap it to open a small text field with an Add button; the X closes it again, and what you typed is kept. Computers and tablets still show the full bar.
- Screen readers: tasks are now a real list, so a screen reader can say "task 2 of 5" and jump from task to task (pinned, other, completed and search results are separate lists). The sidebar is now a navigation area, and its buttons are read as "Tasks, 2 open" instead of "Tasks 2".

- Each list in the sidebar has "Move up" and "Move down" in its menu, so lists can be reordered without dragging. The list rows are no longer an extra Tab stop announced as a "sortable button" around the real buttons, and the old keyboard drag on them is replaced by these menu items.

### Fixed
- A message with an Undo button no longer works behind an open window such as "Remove all data": it is dimmed and cannot be reached until the window closes, and its countdown waits, so the Undo is still there afterwards.

## [0.2.2] - 2026-11-25

### Added
- A third task row style, Minimal, in Settings > Appearance (now called "Task rows"), close to Microsoft To Do: tasks stay cards, with a one-line title (cut with "..." when long) and just one small gray line under it, no note, pills or footer line with the steps, due date, small icons for a reminder, repeat and note, the first tags and the list name. Only an overdue date is colored.
- The browser's Back and Forward buttons now work in the app. Each list, tag and page has its own link, so Back and Forward walk through the places you visited, reloading keeps you where you were (also in Search and Settings), and you can bookmark or share a link to a list. On a phone, the back gesture goes from a list to the Lists screen instead of leaving the app, and Back closes an open task, list or tag panel (and date pickers) instead of leaving the page. A link to a list or tag that no longer exists opens My Day.
- Press 1, 2, 3 or 4 to open My Day, Important, Planned or Tasks (they are in the shortcuts list, press ?).
- The browser tab and history list now name the page ("Groceries · Macrohard Done"). Keyboard users get a "Skip to tasks" link as the first Tab stop, and on a phone the screen reader moves to the page's title after you open a list.

- Reminders now alert you. At the time you set with "Remind me", a message appears in the app with an Open button that takes you to the task. In Settings > Reminders you can turn on notifications on this device, so you are also alerted while the app is in the background or installed and running; "Send a test" shows what they look like. A reminder that came due while the app was closed alerts when you open it again (up to a day later), several at once become one message, and each reminder alerts only once. A closed app still cannot alert you.

### Changed
- The sidebar always shows where you are: the open list stays visible when its group is collapsed, the open tag stays visible when the tags are folded, and the sidebar scrolls the open place into view when you reach it with Back or a shortcut. Deleting the list you have open now takes you to My Day instead of leaving an empty page.
- Tasks are cards again: each task sits on its own rounded card with a soft border and shadow and a small gap between cards, in every list, in Planned and in Search. On a phone the note, dates, steps and tags use the full width of the card instead of a narrow strip beside the buttons. Pointing at a card lifts it, and the selected card gets a border in the list's color.
- The details on each card are laid out in groups. The note shows as a short gray description right under the title. The due date, reminder and repeat are three separate pills that say what they are ("Due Friday", "Remind at 4:00 PM", "Weekly"); the due date is the filled one and turns red when overdue or blue today. Below that, a small progress bar shows the steps (click it to open them). Tags show on the card as colored chips (two in the compact view, three in the comfortable view, then "+2"), and clicking one shows only the tasks with that tag. A line at the bottom holds the tags on the left and, in views that mix lists, the list name on the right; click it to open that list.
- Quick Actions in the task details are now a compact grid of tiles, two per row (due date and reminder, then repeat and My Day), instead of four tall rows. A tile shows its value under the name once it is set (the reminder now includes its time), and a small X in its corner clears it.

### Fixed
- The Task rows choice in Settings now works with the arrow keys like the theme choice does.
- On a phone, the "Add a task" bar at the bottom was hidden all the time, so you could not add tasks there. It is back, and it still hides while a panel or dialog is open.
- Dates are always in English now. With a German browser, My Day showed "Mittwoch, 25. November" under an English title; it now reads "Wednesday, November 25", and the "Created" date in the task details and the dates in Settings follow suit.
- On a phone, tapping a list briefly showed the list's row from the Lists screen on top of the page for a moment. It no longer does.
- Security: updated the parts of the app that show your notes and create IDs to versions without known security problems.

## [0.2.1] - 2026-11-24

### Fixed
- "Duplicate list" now really copies the list: a new list called "<name> copy" appears right after the original with its icon, color, settings and all its tasks (with their steps, tags and dates), and an Undo button in the message removes it again. Before, it only added one task called "<name> Copy". Tasks in My Day are not added to My Day a second time.
- The "Hide list" entry in a list's menu is gone: it did nothing but open the Edit panel.
- A reminder ("Remind me") on a task could be cleared for a moment when you opened the task's details, and was lost if you reloaded or closed the app right then. Opening a task no longer changes anything, and reminders stay put.

## [0.2.0] - 2026-11-23

### Fixed
- Planned now also shows tasks that only have a reminder ("Remind me"), as in Microsoft To Do. They are grouped by the reminder's day, and the Planned count includes them. A task with both a due date and a reminder is placed by its due date.
- "Use group icon for all lists" now works everywhere: the group's icon shows on its lists in the sidebar (both sizes), in the list's page header, while dragging a list and in the list's preview, not only next to tasks in search and My Day. A group no longer asks for a color, since it was never used.
- Dragging a list out of a group is now easy: while you drag a grouped list, a "Drop here to take out of the group" box stays at the top of the lists. You can also drop a list straight onto any list in another group or onto the ungrouped lists, and it lands above or below it depending on which half you drop on. Before, the list often landed somewhere else, or nothing happened.

### Changed
- Fewer boxes inside boxes in the task details: the Tags and Notes fields now stand on their own under their headings (the extra "Add note" row is gone), and the repeat settings are one card with a line between "Every", "Count the next date from" and "Repeat on days" instead of a separate, tinted box for the weekdays.
- Pin has a keyboard shortcut now: select a task and press P to pin it to the top of its list or unpin it (it is in the shortcuts list, press ?). The buttons in the task details show their keys when you point at them: P for Pin, Space for Complete, and Ctrl+S now really saves and closes (it did nothing while editing before), even while you are typing in a field.
- The bottom of the task details is tidier and shorter: Duplicate, Pin, Complete and Move share one rounded bar, and below it "Remove" sits on the left with a single "Done" button on the right, replacing "Close" and "Save manually". Changes are still saved as you make them, and Done saves and closes.
- On wide screens the search box in the sidebar is now a real text field: clicking it just puts the cursor there instead of opening another page. The results appear next to it as you type, Enter or the down arrow moves into them, and Escape clears the box. On phones, tapping Search still opens the Search screen.
- On phones, the page header has more room for the title: the back button is just an arrow instead of an arrow with the word "Lists", and the icon tile is a little smaller.
- The profile pill is gone from the page header, because next to a list's title it looked as if that list also exists in other profiles. The profile you are in is still shown at the top of the sidebar (and the Lists screen on phones), and you switch from there.
- The panels for making and editing a list or group have a new look. The icon and name sit together at the top, the colors are round swatches with a check on the one you picked, and the preview now shows how the list's page will look in that color (header, tasks and the add button). Changes to an existing list are saved as you make them, so the button now says "Done", and "Remove" and the "Saved" note sit beside it.
- A cleaner page header: the page's icon (or the list's emoji) sits in a soft tile in the list's or tag's color, with the title beside it and a small line underneath: today's date in My Day, and the number of open tasks everywhere else. The colored top line and dot are gone; the soft color wash stays. To rename or recolor a list, use the pencil button on the right, next to the sort and view button.
- A calmer lists section in the sidebar: a group's add and menu buttons only show when you point at its heading, the lists in a group sit under a thin guide line, and the open list is marked by its color bar and tint alone (no bold text). A list's count gives way to its menu button when you point at it, and the dotted drag handle is gone (the whole row still drags).
- "New group" now opens the same side panel as "New list" instead of a pop-up in the middle of the screen. Both panels close with Escape and create with Enter.
- The icon-only sidebar now matches the labelled one: the same order (Search, My Day to Tasks, New group and your lists, Manage tags and your tags, then New list, Settings and shortcuts), the same icons, and icons in the same spot when you switch between them. The collapse button moved to the top left, next to the title, where the expand button is in the icon-only sidebar. Lists show their emoji or a list symbol in both, and tags show a round # chip in both. Lists with a color show their color bar in both.
- "New list" is now a button with text, always visible at the bottom of the sidebar, instead of a small icon next to the Lists heading.
- On phones the sidebar is no longer a slide-over menu opened with a hamburger button; it is the Lists screen. The sidebar is now 260 px wide on desktop, and you can only choose between labels and icons on wide windows.
- A flatter, calmer task list: tasks are plain rows with a thin line between them instead of separate cards, and rows are more compact. The title is lighter, with a small line underneath showing the due date, steps ("1 of 3") and small icons for a reminder, repeat or note.
- Categories are now called tags everywhere you see them, and each tag shows as a small rounded chip written as #name, softly tinted with its color. Your existing categories and the tasks that use them are unchanged.
- You set tags in the task details, and the sidebar lists them with their count. Tags do not show on the task rows.
- The list name only shows on a task when you are looking at a view that mixes lists (My Day, Planned, Tasks), not inside the list itself.
- Lists and tags now bring their color to the whole page they show, in a quiet way. The header gets a color line and a soft wash, the page behind the tasks takes a very faint tint, the "Add a task" button and the bar of the selected task use the color, and the task details get a thin line of their list's color. The open list or tag in the sidebar is tinted and barred in its own color, and so is the icon-only sidebar. Tasks shown in views that mix lists (My Day, Planned, Tasks) get a small dot in their list's color next to the list name. The color is adjusted so text stays readable in light and dark mode, and a list or tag without a color keeps the normal blue.
- One blue accent is used for selection, focus and buttons. The selected item in the sidebar is marked with a blue bar. Completed checkboxes are green, and today's due date is blue.
- The app now uses your device's own font instead of downloading one, so it loads faster and looks the same offline.
- Colors in light and dark mode are a little clearer and easier to read, including overdue dates and the important star. Task details, menus, forms, notes and pop-up messages now use the same colors, and the gradient backgrounds are gone.
- Typing and editing feel lighter: the app saves a moment after you stop making changes instead of after every keystroke, and the side panel, lists and tags only redraw when something they show changes. Your last changes are always saved before you leave or hide the page, switch profile or import a backup.

### Added
- Profiles, such as Personal and Work, inside the same app and account. Each profile has its own lists, tasks and tags; theme and layout settings are shared. The profile you are in is always visible: a coloured badge with its name at the top of the sidebar, a coloured badge in the icon-only sidebar, the profile menu at the top of the Lists screen on phones, and the name in the browser tab. Click any of them to switch, or choose "Add or manage profiles" to add, rename, recolour or delete profiles (also in Settings). Your existing data is now the profile "Personal". Export, import and "Remove all data" apply to the profile you are in. With sync on, each profile syncs on its own, and profiles made on one device show up on your others. If you already set up sync, run the updated `supabase/schema.sql` once more (see the README).
- Optional accounts and sync (early preview). When the app is connected to a Supabase project, Settings has an Account section: create an account or sign in, and your tasks, lists and tags are kept in sync between your devices. Changes upload a few seconds after you make them, and other devices pick them up when you come back to the app. If two devices changed the same data, nothing is merged: you choose which copy to keep. Without a connection or an account, the app works as before and your data stays on the device.
- A Settings page (at the bottom of the sidebar). Appearance: choose Follow device, Light or Dark, and a Compact or Comfortable row height. Lists: see and edit your own lists. Data: export a backup file, import one, and remove all data. The theme button that was in the header now lives in Settings. Apps that already had a saved light or dark choice keep it.
- Backups. "Export a backup" saves all your tasks, lists, groups, tags and settings to a file. "Import a backup" checks the file first and shows what is in it, with anything it had to repair or skip, and only replaces your data when you confirm. Your previous data is kept, so "Undo the last import" brings it back. If something goes wrong while saving, nothing is changed, and if the app cannot be sure the data was saved it says so instead of claiming success. Files that are not backups, are from a newer version, or are far too large are refused.
- "Remove all data" asks for confirmation, offers to export a backup first, and removes everything from this device, including the copy kept for undoing an import.
- Three layouts that fit the screen. On wide windows (1100 px and up) the task details stay open as a pane on the right while you move around the list, and clicking another task switches the pane. On medium windows (700 to 1099 px) the sidebar shows only icons and the details slide over the list. On phones (under 700 px) the Lists screen is home: pick a list to open it, and use "Lists" at the top left to go back. The details open as a bottom sheet, and search is an icon at the top right.
- Swipe gestures on touch screens: swipe a task right to add it to or remove it from My Day, or left to delete it (with Undo). Scrolling the list never triggers them. They need a clear sideways swipe of about a thumb's width.
- A Search view. Press F or Ctrl+F (Strg+F; or use the Search button in the sidebar) and type: it looks through the title, notes, steps and tags of every task, ignoring capitals and accents ("cafe" finds "Café"), and all your words must match. Each result shows its list and where the words were found, with the matching letters highlighted, and finished tasks come last. Narrow the results with the list, tag, due date ("Overdue", "Today", "Tomorrow", "Next 7 days", "No due date") and Important filters, or use the filters alone to browse. Press Down in the search box to move to the results, where the usual task shortcuts work, and Esc to clear the box. At most 200 results are shown, and you are told when there are more.
- In the task details, click a tag chip to close the details and show only tasks with that tag in the view you are in (for example only #errands in My Day). A bar above the list shows the filter, with a "Clear filter" button. The filter ends when you go to another list or view.
- When you complete a task it now stays in place for a moment with a green check, so a slip can be fixed right away, and then slides into "Completed". If your device is set to reduce motion, it moves at once.
- Keyboard shortcuts. Select a task with the arrow keys (or by clicking it), then press Space to complete it, S for important, M for My Day, D for a due date, R for a reminder, Enter to open it, Delete to remove it, Ctrl+Shift+M to move it to another list, and Alt+Up or Alt+Down to reorder it in a manually sorted list. N adds a task, F or Ctrl+F searches, Ctrl+Z undoes while the Undo message is showing, and ? shows the full list. A "Keyboard shortcuts" link is at the bottom of the sidebar.
- After you complete or delete a task with the keyboard, the next task is selected so you can keep going. A clear blue ring shows where the keyboard is.
- Each task has a sun (My Day), a pin and a star. Hover a task to show the ones that are still off; the ones that are on (a blue sun, a pinned pin, a yellow star) always stay visible, so you can see a task's state at a glance. Click the pin to pin a task to the top of its list, and click it again to unpin (a task pinned to all views shows its pin in blue). The small pin that used to appear under the title is gone, since the button shows it. On touch screens the star always shows, and the sun and pin show once set; the "more" menu and swipes still reach them.
- Screen readers now announce tasks as, for example, "Complete task: Call Anna, due tomorrow".

- Right-click a task and choose "Set due date" to open its details with the date picker already showing.

- The search box in the sidebar now opens the Search view instead of hiding tasks in the list you were looking at, and your search is no longer remembered when you reopen the app. My Day's Suggestions no longer disappear while you search.

### Improved
- The full sidebar is better organized. It now reads top to bottom as your views, then "Lists", then "Tags", each with a clear heading. Lists comes before tags because lists are what you use most. The "New list" and "New group" buttons moved into the Lists heading, and "Manage tags" into the Tags heading, so the bottom of the sidebar is just Settings and the keyboard shortcuts button, and there is room to see more of your lists. Rows are softly rounded with the open one tinted, counts line up in a column, rows are 44 px tall on touch screens, the scroll bar is thin, and an empty section shows a short hint ("No lists yet", "No tags yet") instead of blank space.
- Hover and selection colors. A hovered task now gets a light tint of its list's or tag's color (a soft grey elsewhere), and the selected task a clearly stronger one with the colored bar, so the two no longer look alike (before, both were the same grey). Hovering a list or tag in the sidebar or the icon-only sidebar tints it with its own color. The tints are capped so dates and counts stay readable on any color.
- The icon-only sidebar (the collapsed sidebar on wide windows, and the sidebar on medium ones) is now a complete sidebar in miniature. Search is at the top, with the expand button above it on wide windows. Every button is 44 px, with the name in a tooltip. Counts show as small badges on the icons. Each tag is its own button, a colored # in a round chip, with "more" and "Manage tags" after them. Your lists follow in order with a thin line between groups, showing their emoji, or their first letter on the list's color. The old pair of identical + buttons is now "New list" and "New group" with their own icons, followed by Settings and Keyboard shortcuts. The page is also announced properly to screen readers: each button says its full name and which one is open.
- Messages such as "Task completed" with an Undo button now appear at the bottom left, next to the sidebar and above the "Add a task" bar, instead of at the top right where they covered the theme button. They stay for 6 seconds, fade in gently, and have a solid background so they are easy to read.
- Checkboxes and task buttons are larger on touch screens, and rows are taller to make them easier to tap.
- The add-task bar's shortcut hint now shows "N". Ctrl+N still works too.

### Fixed
- A change typed in the last half second before you close the task details, or open another task, is now saved instead of lost. The same goes for list and group edits.
- Search results now update their highlighted words as you keep typing, instead of keeping the highlight of an earlier, shorter search.
- Signing out while sync is still connecting no longer leaves sync running for the signed-out account.
- Routine downloads from the cloud no longer replace the copy that "Undo the last import" brings back, and they no longer need room for a second copy of your data. Choosing the cloud copy in a conflict still keeps a copy of what it replaces.

- A device that only had custom time presets was treated as empty when sync first ran, so the cloud copy replaced them without asking. It now counts as having data and you get the choice.
- Signing out while sync is running no longer lets a late answer from the cloud change your data, and no longer shows "up to date" for a signed-out account. If sync cannot start, the Account section now says so.
- Choosing a side in a sync conflict now waits for a sync that is already running instead of running at the same time.
- Syncing no longer changes your theme, row height or sidebar to match another device; those stay as you set them on each device.
- Escape in the date or reminder picker closes only the picker, and a second press closes the task details. Tab now stays inside the task details and the pickers while they are open, and focus returns to where you were when they close.
- Theme and row height choices in Settings can be changed with the arrow keys, and Tab only stops on the chosen one, like any radio group.
- The tick box on each task keeps one name for screen readers and reports done or not done separately, instead of changing its name and saying it twice.
- "Due" dates shown as weekday names now start the week on Monday, like the Planned view.
- While you keep typing without a pause, your changes are now saved at least every 5 seconds.
- The offline cache no longer keeps growing: it holds a limited number of files, oldest first.

- One press of Escape now closes only the top item: a right-click menu, the shortcuts list, a tooltip, the tag dropdown or the new-task form's date picker no longer close the panel behind them as well. The task pane that stays open beside the list only closes on Escape when focus is in it or on the page itself, not when you are on some other control.
- Tab now stays inside the quick add window, the group window and the tag manager while they are open, and focus returns to where you were when they close.
- Screen readers now get names for the tag manager's close, edit and delete buttons, the group expand/collapse arrow and each step's tick box. Pop-up messages are announced reliably, including the first one.
- Removed two unused files (an old add-task form and statistics code). Nothing you can see changed.

## [0.1.0] - 2026-11-22

### Fixed
- Pressing Escape now closes the New list, New group, list and group edit panels, and the tags manager. Each press closes one layer: an open emoji picker first, then a tag form or confirmation, then the panel itself.
- Tasks saved by older versions now load correctly, and due dates and reminders keep working after a reload.
- Repeating tasks that are several days overdue now move to their next date right away, and they update when a new day starts.
- If your saved data is damaged, a backup copy is kept instead of being overwritten. You are also told when changes can't be saved.
- Reordering tasks while searching no longer scrambles the tasks that are hidden.
- Quick add no longer clears what you typed when a task can't be created.
- Editing one category no longer shows another category's details.
- The date picker no longer shows the wrong day late in the evening or early in the morning.
- Completed tasks no longer disappear. In My Day, Important, Planned, Tasks and categories they now move to a "Completed" section, as they already did inside a list.
- Duplicating a task now keeps its steps and categories.
- Tasks you create in My Day are now added to My Day, tasks created in Important are marked important, and tasks created in Planned get today's date, so they show up where you made them.
- The "Tomorrow" and "This week" due date filters now work.
- Categories beyond the first five can now be reached from the sidebar ("Show more").
- The category picker can now be opened with the keyboard.
- Loading problems no longer cause the screen to flicker endlessly.

### Added
- My Day now starts fresh every day, like in Microsoft To Do. Tasks you added on an earlier day (finished or not) leave My Day at midnight but stay in their lists. Tasks due today still show up automatically.
- Undo: completing or deleting a task, and deleting a list (with its tasks), now shows an "Undo" button. Deleting no longer asks "Are you sure?" first.
- Repeating tasks now work like in Microsoft To Do: completing one creates the next task right away, with its steps open again. You can repeat every 2, 3, ... days, weeks, months or years, and choose whether the next date counts from the due date or from the day you completed it.
- Planned is now grouped into Earlier, Today, Tomorrow, This week and Later, sorted by date.
- My Day has a "Suggestions" section with your overdue and important tasks, each with a button to add it to My Day.
- Steps can be moved up or down from their menu.
- Lists have a "Sort and view options" button: sort by importance, due date, My Day, alphabet or creation date (and reverse it), hide completed tasks, and add new tasks to the top instead of the bottom.
- Works on phones: the sidebar becomes a menu you open with the menu button, and the layout fits small screens, including notched ones.
- On phones, task details, list and group editors, quick add, the date picker and the category manager now open full screen instead of as small panels.
- Task details are more compact on phones: tighter spacing, smaller rows and a shorter bottom bar, so more of the task is visible without scrolling.
- Tapping or clicking a task now opens its details. The steps have their own button to show or hide them.
- Every task and list now has a "more" (⋯) button with all its actions, so touch screens no longer need right-click.
- You can install the app on your phone or computer, and it opens without an internet connection.

### Improved
- The light/dark mode button is now always visible in the header with a sun or moon icon, instead of being hidden in a "more" menu.
- List and category colors stay readable in both themes: text in a color that is too dark or too light for the current theme is adjusted automatically.
- Hovering (or tabbing to) the main buttons now shows a small tooltip with what the button does and its keyboard shortcut. Icon-only buttons in a collapsed sidebar are labelled too.
- The theme follows your device setting the first time you open the app, and scroll bars and form fields match it.
- Keyboard shortcut hints show ⌘ on Mac and iPhone and Ctrl elsewhere.
- Hidden buttons (like deleting a step) are always visible on touch screens and appear when focused with the keyboard.
- Dragging tasks on a touch screen no longer interferes with scrolling, and tapping controls no longer zooms the page.
- Animations are reduced if your device is set to reduce motion.
- The app feels faster, especially with many tasks.
- Screen readers get proper names for task buttons, color choices and pop-up panels.
- The emoji picker no longer shows the same emoji twice.

### Changed
- The "Add a task" bar is simpler and easier to read: a plain white bar with a plus button instead of the blue-purple gradient. It shows the keyboard shortcut on computers, and the plus, outline and Add button use the color of the current list. Text on very light list colors stays readable.
- Steps in the task details now look like Microsoft To Do: a simple list under the task title with round checkboxes and a "more" menu, and a blue "Next step" line at the end. Press Enter to add several steps in a row. A step can be turned into its own task from its menu.
- The "Add a task" bar stays open after adding a task, so you can type several in a row. Press Esc to close it.
- The "Add a task" bar is hidden while the task details (or a list or group editor) are open, and comes back when they close.
- The four buttons at the bottom of the task details (Duplicate, Pin, Complete, Move) are no longer squeezed: each has the same size with its name under the icon, also on phones.
- Long task titles in the task details now wrap onto several lines instead of being cut off.
- A calmer task list: every task is its own separate card with a gap between cards. Every card has the same three lines: a small gray line on top with the list, due date and repeat, then the title, then a line with steps, My Day, reminder and categories. Only overdue dates are red and important tasks have a yellow star. Lists and categories show as a small colored dot. The "more" button appears when you hover a task, and pin and edit moved into it (click a task to edit it).
- Pinned tasks now have their own "Pinned" section at the top, separate from the other tasks, and the list uses less side padding on phones.
- Quotes in notes sit on a light background, and the text uses the Figtree font.
- The quick actions in the task details (My Day, Remind me, due date, Repeat) now all look and behave the same: gray until set, then blue with the value underneath, and an ✕ to remove it.
- The README no longer promises notification alerts or automatic theme matching.
