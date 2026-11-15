import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ApiError } from './api';
import { App } from './App';
import { CinematicProvider, SessionProvider, ToastProvider } from './state';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      // Retry only transient failures (network / 5xx), with backoff.
      retry: (count, err) => {
        const e = err as ApiError;
        if (e?.status && e.status >= 400 && e.status < 500) return false;
        return count < 3;
      },
      retryDelay: (n) => Math.min(8000, 600 * 2 ** n),
      networkMode: 'always',
    },
    mutations: { networkMode: 'always' },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <ToastProvider>
          <SessionProvider>
            <CinematicProvider>
              <App />
            </CinematicProvider>
          </SessionProvider>
        </ToastProvider>
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>,
);
