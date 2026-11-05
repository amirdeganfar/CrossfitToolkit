import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts so the PWA/Tailwind plugins never run under test.
// Tests run in a non-UTC zone with DST (+10/+11) so local-vs-UTC date bugs and
// 23h/25h days surface. Set here so worker processes inherit it at startup.
process.env.TZ = 'Australia/Sydney';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
});
