import { create } from 'zustand';

const initialTheme = localStorage.getItem('mgp-theme') || 'dark';

export const useAppStore = create((set) => ({
  theme: initialTheme,
  toasts: [],
  setTheme(theme) {
    localStorage.setItem('mgp-theme', theme);
    set({ theme });
  },
  pushToast(toast) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({ toasts: [...state.toasts, { id, ...toast }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
    }, 3500);
  }
}));
