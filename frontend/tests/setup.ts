import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * RTL's auto-cleanup only registers itself when its framework adapter is detected.
 * Under plain vitest nothing does that, so each render() appends to the previous test's
 * DOM: getByRole then finds two triggers and fails with "found multiple elements", which
 * reads like a component bug rather than a harness one. Explicit is better.
 */
afterEach(cleanup);

/**
 * Vitest setup, shared by every suite.
 *
 * jest-dom's matchers (toHaveTextContent, toHaveAttribute, ...) are registered here
 * rather than imported per file. They read better as assertions about what the operator
 * sees than as string matching on textContent, and having them available everywhere means
 * the next component suite does not have to rediscover that it needs them.
 */

/**
 * jsdom does not implement matchMedia, and anything that reads a theme or a breakpoint
 * calls it. Left undefined, the failure surfaces as "matchMedia is not a function" from
 * inside a component under test, which reads like a bug in that component.
 */
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/**
 * next/image and next/link are Next's own components; under plain vitest the Next runtime
 * is not installed, so they fail to resolve. Stubbed here rather than in each suite
 * because they are an artefact of the test environment, not of the component under test.
 */
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    const { src, alt, ...rest } = props;
    return { type: 'img', props: { src, alt, ...rest } };
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children?: unknown; href?: string }) => ({
    type: 'a',
    props: { href, ...rest },
    children,
  }),
}));