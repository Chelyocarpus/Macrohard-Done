import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useSyncStore } from './stores/syncStore.ts'
import { useProfileStore } from './stores/profileStore.ts'

// Profiles: follow changes made in other tabs
useProfileStore.getState().init()

// Cloud sync: does nothing unless the cloud is set up and someone is signed in
useSyncStore.getState().init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline support and installability. Only in production builds: during development a cached app
// shell would keep serving stale code. A failed registration (private mode, unsupported browser,
// insecure origin) must never affect the app, so it is ignored.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
