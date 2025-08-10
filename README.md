# Macrohard Done 📝

> A modern, feature-rich Microsoft To-Do clone built with React, TypeScript, and Tailwind CSS

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1.0-61dafb)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0.4-646cff)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.16-38b2ac)](https://tailwindcss.com/)

## ✨ Features

### 📋 Core Task Management
- **My Day** - Focus on today's priorities with ☀️ icon
- **Important** - Mark tasks as important with ⭐ star system
- **Planned** - Schedule tasks with due dates using 📅 calendar
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
- **Reminders** - Set notification alerts

### 🎯 User Experience
- **Dark/Light Theme** - Full theme support with system preference
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Smart Text Handling** - Advanced word wrapping and overflow protection
- **Keyboard Navigation** - Full keyboard accessibility
- **Collapsible Sidebar** - Maximize workspace when needed
- **Real-time Search** - Instant filtering across all tasks

### 💾 Data & Performance
- **Local Storage** - Persistent data without server dependency
- **State Management** - Powered by Zustand for optimal performance
- **Hot Module Reload** - Instant development feedback with Vite
- **Type Safety** - Full TypeScript coverage

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
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
├── stores/             # Zustand state management
│   └── taskStore.ts    # Main application state
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
- Gradient backgrounds in headers

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server with HMR
- `npm run build` - Create production build
- `npm run lint` - Run ESLint code quality checks
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
- Local storage only (no cloud sync)
- No user authentication
- Desktop-focused (mobile optimization ongoing)

### Planned Features
- [ ] Cloud synchronization
- [ ] Multi-user support
- [ ] File attachments
- [ ] Advanced filtering
- [ ] Keyboard shortcuts
- [ ] Export/import functionality
- [ ] Progressive Web App (PWA)
- [ ] Real-time collaboration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Microsoft To-Do's excellent user experience
- Built with modern React ecosystem tools
- Thanks to the open-source community for amazing libraries

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**
