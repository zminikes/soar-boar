import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Stubs for browser APIs used by the share flow. jsdom doesn't provide these.
if (!('share' in navigator)) {
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
}

if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
}
