import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AccountGate from './account/AccountGate';
import './index.css';

// Apply the saved preference before onboarding; new browsers start in dark mode.
try {
  const theme=localStorage.getItem('watchguard-portal-theme')==='light'?'light':'dark';
  document.documentElement.dataset.theme=theme;
  document.documentElement.style.colorScheme=theme;
} catch { /* Dark HTML default also works without browser storage. */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountGate><App /></AccountGate>
  </StrictMode>,
);
