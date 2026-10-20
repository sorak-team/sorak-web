import { create } from 'zustand';

const STORAGE_KEY = 'sorak_global_page_size';
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

function getInitialPageSize() {
  if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE;
  try {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    if (PAGE_SIZE_OPTIONS.includes(saved)) {
      return saved;
    }
  } catch {
    // fallback
  }
  return DEFAULT_PAGE_SIZE;
}

export const usePaginationStore = create((set) => ({
  pageSize: getInitialPageSize(),

  setPageSize: (size) => {
    const num = Number(size);
    const validSize = PAGE_SIZE_OPTIONS.includes(num) ? num : DEFAULT_PAGE_SIZE;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, String(validSize));
      } catch {
        // ignore
      }
    }
    set({ pageSize: validSize });
  },
}));
