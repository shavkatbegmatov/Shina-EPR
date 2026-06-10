import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Har testdan keyin DOM ni tozalaymiz
afterEach(() => {
  cleanup();
});
