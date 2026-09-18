import { useCallback, useEffect, useRef, useState } from 'react';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'nestjs-agents-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  );

  return { theme, toggleTheme };
}

/**
 * Keeps the thread pinned to the newest message while it streams, unless the
 * reader has scrolled up to look at something.
 */
export function useAutoScroll<T>(dependency: T) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  const onScroll = useCallback(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    pinned.current = distance < 80;
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (node && pinned.current) {
      node.scrollTop = node.scrollHeight;
    }
  }, [dependency]);

  return { ref, onScroll };
}
