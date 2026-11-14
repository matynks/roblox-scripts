import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info' | 'coin';

export type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ToastState = {
  toasts: Toast[];
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (toast) =>
    set((state) => ({
      // Keep at most three visible.
      toasts: [...state.toasts, { ...toast, id: nextId++ }].slice(-3),
    })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, message?: string) => useToastStore.getState().show({ tone: 'success', title, message }),
  error: (title: string, message?: string) => useToastStore.getState().show({ tone: 'error', title, message }),
  info: (title: string, message?: string) => useToastStore.getState().show({ tone: 'info', title, message }),
  coin: (title: string, message?: string) => useToastStore.getState().show({ tone: 'coin', title, message }),
};
