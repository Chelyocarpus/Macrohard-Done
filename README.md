# Macrohard Done 📝

> A simple task manager with lists, steps, reminders and My Day. It works offline, installs like an app, and keeps your data on your device unless you turn on sync. Built with React, TypeScript, and Tailwind CSS

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1.0-61dafb)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0.4-646cff)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.16-38b2ac)](https://tailwindcss.com/)

## ✨ Features

### 📋 Core Task Management
- **My Day** - Focus on today's priorities with ☀️ icon
- **Important** - Mark tasks as important with ⭐ star system
- **Planned** - Schedule tasks with due dates or reminders using 📅 calendar
- **Tasks** - View all tasks across lists with ☑️ organization
- **Completed** - Track finished tasks with ✅ completion

### 🎨 Advanced Features
- **Custom Lists** - Create personalized lists with:
  - 🎨 Custom colors with modern accent system
  - 📰 Emoji support for visual identification
  - 🎯 Colored task count badges
  - ✨ Gradient backgrounds and visual accents

### 📝 Rich Task Details
- **Comprehensive Task Editor** - Professional sidebar interface
- **Subtasks/Steps** - Break down complex tasks with progress tracking
- **Notes** - Detailed descriptions and additional context
- **Due Dates** - Smart date picker with quick preset options
- **Repeat Functionality** - Smart recurring tasks that:
  - Complete normally for the day
  - Automatically reset with new due dates
  - Support Daily, Weekdays, Weekly, Monthly, Yearly patterns
- **Reminders** - Set a reminder date and time on any task. While the app is open you get a message with an **Open** button at that time. In **Settings > Reminders** you can turn on system notifications (this device only), which also reach you when the app is in a background tab or a running installed app; **Send a test** shows what they look like. A reminder that came due while the app was closed alerts when you open it again, up to a day later. A closed app cannot alert you (see "Current Limitations")

### 🎯 User Experience
- **Calm, flat design** - Tasks are compact cards with one blue accent and your device's own font (nothing to download)
- **Settings** - Open Settings from the bottom of the sidebar. Choose the theme (follow your device, light or dark) and how task rows look (compact, comfortable, or minimal for one line of details, like Microsoft To Do), and manage your lists. Your choices are remembered
- **Responsive Design** - Three layouts: from 1100 px wide the sidebar, the list and a permanent task-details pane sit side by side; from 700 px the sidebar shrinks to icons and the details open over the list; under 700 px the app shows one screen at a time (Lists, then a list) with the details as a bottom sheet. On a touch screen, swipe a task right to add it to My Day or left to delete it (with Undo); every action is also in the task's "more" menu
- **Installable & Offline** - Add it to your home screen or desktop (PWA); the app opens without a connection once it has been loaded
- **Smart Text Handling** - Advanced word wrapping and overflow protection
- **Navigation that follows the browser** - Every list, tag and page has its own address (`#/list/...`, `#/tag/...`, `#/important`, `#/planned`, `#/tasks`, `#/search`, `#/settings`). The browser's Back and Forward buttons (and a phone's back gesture) walk through the places you visited, Back also closes an open panel or dialog instead of leaving the page, and reloading or sharing the link opens the same place. On a phone, Back from a list returns to the Lists screen. The tab title names the page, and a link to a list or tag that no longer exists opens My Day. Keyboard users get a "Skip to tasks" link as the first Tab stop
- **Keyboard Shortcuts** - Select a task with the arrow keys, then `Space` completes it, `S` marks it important, `M` adds it to My Day, `P` pins it to the top of its list, `D` and `R` set a due date and reminder, `Enter` opens it, `Delete` removes it, and `Alt+↑`/`Alt+↓` reorder it in a manually sorted list. `1` to `4` open My Day, Important, Planned and Tasks, `N` adds a task, `F` or `Ctrl+F` (Strg+F) searches, `Ctrl+Z` undoes while the Undo message is showing, and `?` lists every shortcut. Shortcuts are off while you type in a field.
- **Collapsible Sidebar** - Maximize workspace when needed
- **Search** - Press `F` or `Ctrl+F` (or click the search box in the sidebar) to look through every task's title, notes, steps and tags as you type. Results show the list each task is in and where the words were found, and can be narrowed by list, tag, due date or importance

### 💾 Data & Performance
- **Local Storage and backups** - Your data stays on your device (unless you sign in to sync). In Settings > Data, **Export a backup** saves everything to a JSON file, **Import a backup** replaces everything with the contents of a file (you see a preview first, and can undo it afterwards), and **Remove all data** wipes the device after confirmation
- **Profiles** - Keep Personal, Work and anything else apart: each profile has its own lists, tasks and tags, while theme and layout settings are shared. The profile you are in is always shown (a coloured badge and name at the top of the sidebar, a small badge in the icon-only sidebar, the same badge at the top of the Lists screen on phones, and the browser tab title). Switch from that menu, and add, rename, recolour or delete profiles under **Add or manage profiles** (also in Settings). Up to 8 profiles. Backups, imports and "Remove all data" apply to the profile you are in
- **Accounts and sync (optional, early preview)** - With a free Supabase project connected, Settings > Account lets you sign in and keeps your data in sync across devices, one profile at a time. Without one, nothing changes and the app stays fully local. See "Cloud sync" below
- **State Management** - One Zustand store; screens re-render only for the data they show, and saves are collected so a burst of edits is written once (always before you leave the page)
- **Hot Module Reload** - Instant development feedback with Vite
- **Type Safety** - Full TypeScript coverage

## 🚀 Quick Start

### Prerequisites
- Node.js 20.19+ or 22.12+ (required by Vite 7)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/macrohard-done.git
cd macrohard-done

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the application in action!

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

## ☁️ Cloud sync (optional)

Sync is a proof of concept: one snapshot of each profile's data per account, saved to [Supabase](https://supabase.com) (free tier is enough). The app works offline and without an account exactly as before.

1. Create a Supabase project. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) once. If you ran an earlier version of this file (before profiles existed), run the new one again: it upgrades the table in place and your existing data becomes the profile "Personal".
2. For a quick test, turn off **Authentication > Providers > Email > Confirm email** (otherwise new accounts must click a link first).
3. Copy `.env.example` to `.env.local` and fill in the project URL and the public `anon` key (**Project Settings > API**). Never use the `service_role` key here.
4. Run `npm run dev` (or `npm run build`; the two values are read at build time, so set them in your host's environment settings when deploying).
5. Open **Settings > Account**, create an account and sign in. Success looks like "Up to date. Last synced ..." and a row for you in the `user_snapshots` table. Sign in on a second browser to see your data arrive.

How it behaves:
- Edits upload about 3 seconds after you stop; returning to the tab checks the cloud (at most every 15 seconds). **Sync now** forces a check.
- If this device and the cloud both changed, nothing is merged: you pick **Keep the account copy** or **Keep this device's data**. Signing in on a device that already has tasks, to an account that already has data, also asks.
- Signing out keeps the data on the device. "Remove all data" only empties this device's copy of the profile you are in; signing in again brings the cloud copy back.
- Profiles: only the profile you are in syncs. Switching profile first uploads your last changes if that takes a moment (at most about 4 seconds), then reloads the app in the other profile. A profile made on another device shows up in the profile menu after you sign in or press **Sync now**, and its data downloads when you open it. Renames and colours: the newer change wins. Deleting a profile while signed in also deletes its cloud copy (if that fails, nothing is deleted).
- Known limits of profiles: deleting a profile while signed out leaves its cloud copy, and it comes back the next time you sign in. A profile deleted on one device that still exists on another is uploaded again from that other device. Up to 8 profiles.
- Known limits of the proof of concept: the whole snapshot is uploaded on every change (limit about 5 MB), no merging of changes, no live updates (changes arrive when you return to the tab), email and password only.

## 🏗️ Architecture

### Tech Stack
- **Frontend Framework**: React 19.1.0 with TypeScript
- **Build Tool**: Vite 7.0.4 for lightning-fast development
- **Styling**: Tailwind CSS 3.4.16 with custom design system
- **State Management**: Zustand 5.0.7 for lightweight, scalable state
- **Icons**: Lucide React for consistent iconography
- **Date Handling**: date-fns 4.1.0 for robust date operations
- **Utilities**: clsx + tailwind-merge for conditional styling

### Project Structure
```
src/
├── components/          # Reusable React components
│   ├── ui/             # Base UI components (Button, Input)
│   ├── Sidebar.tsx     # Navigation sidebar
│   ├── TaskView.tsx    # Main task display area
│   ├── TaskItem.tsx    # Individual task component
│   ├── TaskDetailSidebar.tsx  # Task editing interface
│   └── ListEditSidebar.tsx    # List management interface
├── hooks/              # React hooks (keyboard shortcuts, Escape and Back handling, address and history sync, reminders)
├── stores/             # Zustand state management
│   ├── taskStore.ts    # The main store: loads saved data, times saves, joins the groups below
│   ├── task/           # The store's actions by area (tasks, lists and groups, tags, presets, view, backups)
│   ├── profileStore.ts # Profiles (Personal, Work, ...)
│   ├── syncStore.ts    # Optional cloud sync
│   └── toastStore.ts   # Pop-up messages
├── types/              # TypeScript type definitions
│   └── index.ts        # Core interfaces
├── utils/              # Utility functions
│   ├── cn.ts          # Conditional className utility
│   ├── dateUtils.ts   # Date formatting helpers
│   └── storage.ts     # LocalStorage management
└── App.tsx            # Main application component
```

## 🎮 Usage Examples

### Creating Tasks
1. Click "Add Task" button or press keyboard shortcut
2. Enter task title and additional details
3. Set due dates, importance, and repeat patterns
4. Organize with custom lists and colors

### Managing Repeating Tasks
```typescript
// Daily task example
Task: "Take vitamins"
Repeat: Daily
Due: Today

// When completed today → automatically appears tomorrow
// Previous completion stays in history
```

### Custom Lists with Colors
- Create themed lists with emoji + color combinations
- Visual accents throughout the interface
- Color-coded task count badges
- A color line and soft tint in the page header

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server with HMR
- `npm run build` - Create production build
- `npm run lint` - Run ESLint code quality checks
- `npm test` - Run the unit tests (Vitest; they live next to the code as `*.test.ts`)
- `npm run preview` - Preview production build locally

### Code Quality
- **ESLint** - Comprehensive linting with TypeScript support
- **TypeScript** - Strict type checking for reliability
- **Prettier** - Consistent code formatting
- **Modern Standards** - ES2022+ with latest React patterns

### Key Development Features
- Hot Module Replacement (HMR) for instant feedback
- Comprehensive TypeScript coverage
- Component-based architecture
- Custom hooks for state management
- Responsive design patterns

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Maintain component modularity
- Ensure responsive design
- Add proper error handling
- Write descriptive commit messages

## 🐛 Known Issues & Roadmap

### Current Limitations
- Data lives in each browser or installed copy; it is shared between devices only through the optional cloud sync (early preview, see "Cloud sync")
- Sign-in exists only for that sync (email and password); there are no shared lists or other users
- Dates and labels are English only
- Reminders alert only while the app is running (open, in the background, or an installed app that is still running): there is no server to wake a closed browser or phone. Only the profile you are in alerts, there is no snooze, and on an iPhone the app must be added to the Home Screen first
- Offline support and installing need a production build served over HTTPS (or localhost); `npm run dev` does not register the service worker
- On Windows/Linux Chrome, Ctrl+N is reserved by the browser, so that shortcut may not fire there; press `N` instead

### Planned Features
- [ ] Reminders that reach a closed app (needs push notifications from a server) and snooze
- [ ] Cloud sync that merges changes and updates live
- [ ] Multi-user support
- [ ] File attachments
- [ ] Saved filters
- [ ] Real-time collaboration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Microsoft To-Do's excellent user experience
- Built with modern React ecosystem tools
- Thanks to the open-source community for amazing libraries

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**
