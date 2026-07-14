import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

// Start MSW before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers between tests so one test's overrides don't leak
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});

// Shut MSW down after all tests
afterAll(() => server.close());

// Silence react-hot-toast in tests
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

// Suppress console.error for expected React warnings in tests
const originalError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('act('))
  ) return;
  originalError(...args);
};
