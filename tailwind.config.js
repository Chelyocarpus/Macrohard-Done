/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        // The UI spec's layout breakpoints: phone under 700px, three panes from 1100px
        'md': '700px',
        'lg': '1100px',
      },
      spacing: {
        '68': '17rem', // 272px (w-64 + padding)
        '20': '5rem',  // 80px (w-16 + padding)
        '400': '25rem', // 400px (384px sidebar + 16px margin)
        '408': '25.5rem', // 408px (384px sidebar + 24px margin)
        '416': '26rem', // 416px (400px sidebar + 16px margin)
        '424': '26.5rem', // 424px (400px sidebar + 24px margin)
      },
      colors: {
        // Design tokens: the values live in index.css (:root and .dark) and switch with the theme,
        // so a class like `bg-canvas` needs no `dark:` partner.
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        sidebar: 'rgb(var(--c-sidebar) / <alpha-value>)',
        hover: 'rgb(var(--c-hover) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          hover: 'rgb(var(--c-accent-hover) / <alpha-value>)',
        },
        'on-accent': 'rgb(var(--c-on-accent) / <alpha-value>)',
        important: 'rgb(var(--c-important) / <alpha-value>)',
        overdue: 'rgb(var(--c-overdue) / <alpha-value>)',
        done: 'rgb(var(--c-done) / <alpha-value>)',
        // Row hover and selected backgrounds: soft neutrals normally, tints of the list or tag colour on its page
        'row-hover': 'var(--row-hover)',
        'row-selected': 'var(--row-selected)',
        // The colour of the list or tag being shown (blue accent when it has none): see utils/accentTheme.ts
        list: {
          DEFAULT: 'rgb(var(--c-list) / <alpha-value>)',
          text: 'rgb(var(--c-list-text) / <alpha-value>)',
        },
        'on-list': 'rgb(var(--c-on-list) / <alpha-value>)',        // Older components still say `primary-*`; it now follows the accent token.
        primary: {
          500: 'rgb(var(--c-accent) / <alpha-value>)',
          600: 'rgb(var(--c-accent) / <alpha-value>)',
          700: 'rgb(var(--c-accent-hover) / <alpha-value>)',
        },
      },
      fontFamily: {
        // System fonts only: nothing to download, so text looks native and works offline.
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      animation: {
        'in': 'fadeInSlideUp 0.3s ease-out',
        'slide-in-from-right': 'slideInFromRight 0.3s ease-out',
        // Short fade for messages
        'toast-in': 'toastIn 160ms ease-out',
        // The check inside a checkbox fills in over 120ms
        'check-in': 'checkIn 120ms ease-out',
      },
      keyframes: {
        fadeInSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        checkIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInFromRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
