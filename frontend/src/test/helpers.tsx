import { type ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Fresh QueryClient per test — prevents cache bleed
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

interface RenderOptions {
  initialEntries?: MemoryRouterProps['initialEntries'];
}

export function renderWithProviders(
  ui: ReactNode,
  { initialEntries = ['/'] }: RenderOptions = {}
): RenderResult {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Helper: set a JWT in localStorage before rendering
export function setJwt(token = 'valid-test-jwt') {
  localStorage.setItem('vidyaai_jwt', token);
}

export function clearJwt() {
  localStorage.removeItem('vidyaai_jwt');
}
