'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hide a chrome bar on scroll-down, reveal it on scroll-up.
 *
 * WHY A HOOK: both the header and the bottom bar used to implement this
 * separately, and both got it wrong the same way -- the effect depended on the
 * `lastScrollY` state, so every scroll frame tore down and re-added the
 * listener and re-rendered the page. Here the previous position lives in a ref,
 * so the effect registers exactly once.
 */
export function useScrollChrome(options?: {
  /** Below this many pixels the bar is always shown. */
  topSafeZone?: number;
  /** Must scroll down past this before the bar hides, so it never flickers. */
  hideThreshold?: number;
  /** Upward delta needed to reveal it again -- stops jitter at the boundary. */
  revealThreshold?: number;
  /** Set false to disable (e.g. no bar on this breakpoint). */
  enabled?: boolean;
}): boolean {
  const {
    topSafeZone = 40,
    hideThreshold = 80,
    revealThreshold = 15,
    enabled = true,
  } = options ?? {};

  const [isVisible, setIsVisible] = useState(true);
  // A ref, not state: this must never trigger a render.
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(() => {
        const current = window.scrollY;
        const previous = lastScrollY.current;

        if (current < topSafeZone) {
          setIsVisible(true);
        } else if (current > previous && current > hideThreshold) {
          setIsVisible(false);
        } else if (current < previous - revealThreshold) {
          setIsVisible(true);
        }

        lastScrollY.current = current;
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enabled, topSafeZone, hideThreshold, revealThreshold]);

  return isVisible;
}