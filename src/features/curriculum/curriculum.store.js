import { create } from 'zustand';

export const useCurriculumStore = create((set) => ({
  activeThemeName: '',
  setActiveThemeName: (activeThemeName) => set({ activeThemeName }),
  themes: [],
  setThemes: (themes) => set({ themes }),
  activeGoal: null,
  setActiveGoal: (activeGoal) => set({ activeGoal }),
}));
