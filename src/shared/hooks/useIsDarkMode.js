import { useState, useEffect } from 'react';

/**
 * Custom React hook that reactively detects whether dark mode is currently active.
 * Reacts immediately to theme changes triggered by DOM classList updates or system settings.
 */
export function useIsDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    // Sync on initial mount
    checkDark();

    // Observe changes to the 'class' attribute of <html>
    const observer = new MutationObserver(() => {
      checkDark();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Also observe system preference changes if in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      checkDark();
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      observer.disconnect();
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  return isDark;
}
