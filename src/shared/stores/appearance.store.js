import { create } from 'zustand';

// Initial values from localStorage or document
const rawFont =
  typeof window !== 'undefined'
    ? localStorage.getItem('sorak-font') || 'default'
    : 'default';

const initialFont =
  rawFont === 'serif'
    ? 'serif'
    : rawFont === 'mono'
      ? 'mono'
      : 'default';

const initialTextSize =
  typeof window !== 'undefined'
    ? localStorage.getItem('sorak-text-size') ||
      (localStorage.getItem('sorak-small-text') === 'true' ? 'small' : 'medium')
    : 'medium';

const initialSmallText = initialTextSize === 'small';

export const useAppearanceStore = create((set, get) => {
  // Bind fullscreen listeners in browser environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const updateFullscreenState = () => {
      const isDomFullscreen = Boolean(document.fullscreenElement);
      const isWindowFullscreen =
        Boolean(window.screen) &&
        window.innerHeight >= window.screen.height - 4 &&
        window.innerWidth >= window.screen.width - 4;
      set({ isFullscreen: isDomFullscreen || isWindowFullscreen });
    };

    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);
    window.addEventListener('resize', updateFullscreenState);

    // Intercept F11 key to invoke HTML5 Fullscreen API so button state syncs
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        get().toggleFullscreen();
      }
    });
  }

  return {
    fontFamily: initialFont, // 'default' | 'serif' | 'mono'
    textSize: initialTextSize, // 'small' | 'medium' | 'large'
    smallText: initialSmallText,
    isFullscreen: typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false,

    setFontFamily: (fontFamily) => {
      set({ fontFamily });
      if (typeof window !== 'undefined') {
        localStorage.setItem('sorak-font', fontFamily);
        document.documentElement.setAttribute('data-font', fontFamily);
      }
    },

    setTextSize: (textSize) => {
      set({ textSize, smallText: textSize === 'small' });
      if (typeof window !== 'undefined') {
        localStorage.setItem('sorak-text-size', textSize);
        localStorage.setItem('sorak-small-text', String(textSize === 'small'));
        document.documentElement.setAttribute('data-text-size', textSize);
        document.documentElement.classList.toggle('sorak-small-text', textSize === 'small');
      }
    },

    setSmallText: (smallText) => {
      const textSize = smallText ? 'small' : 'medium';
      set({ smallText, textSize });
      if (typeof window !== 'undefined') {
        localStorage.setItem('sorak-small-text', String(smallText));
        localStorage.setItem('sorak-text-size', textSize);
        document.documentElement.setAttribute('data-text-size', textSize);
        document.documentElement.classList.toggle('sorak-small-text', smallText);
      }
    },

    toggleFullscreen: async () => {
      if (typeof document === 'undefined') return;
      try {
        if (!document.fullscreenElement) {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          } else if (document.documentElement.webkitRequestFullscreen) {
            await document.documentElement.webkitRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            await document.webkitExitFullscreen();
          }
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err);
      }
    },

    resetDefaults: () => {
      get().setFontFamily('default');
      get().setTextSize('medium');
    },
  };
});
