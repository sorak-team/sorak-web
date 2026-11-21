import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@/shared/lib/i18n';
import { toast } from 'sonner';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';

// Prevent native browser alert/prompt on entire system
if (typeof window !== 'undefined') {
  window.alert = (msg) => {
    toast.info(String(msg));
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);
