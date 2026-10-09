import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Next's compiler handles JSX in the app itself; vitest transforms it independently,
  // so without this the automatic runtime is not injected and every .tsx test fails with
  // "React is not defined" at the first JSX element.
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // jsdom rather than node: the component suites render a React tree, which needs a
    // DOM, querySelector, and user-event's event dispatch. The pure-logic suites would
    // run fine under node, but a split config means the component suites silently skip
    // instead of failing loudly if the environment is misconfigured.
    environment: 'jsdom',

    // .tsx included so a component test is actually collected. The previous pattern was
    // tests/**/*.test.ts, which cannot run a .tsx file at all -- a component suite could
    // have been written, never executed, and reported as no failures.
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],

    setupFiles: ['./tests/setup.ts'],
  },
});
