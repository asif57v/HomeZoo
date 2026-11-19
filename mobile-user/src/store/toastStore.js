import { create } from 'zustand';

let id = 0;
export const useToastStore = create((set) => ({
  toasts: [],
  show: (message, type = 'info', duration = 3000) => {
    const t = { id: ++id, message: String(message || ''), type };
    set((s) => ({ toasts: [...s.toasts.slice(-2), t] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== t.id) })), duration);
  },
}));

// Same call shape as react-hot-toast used on the web
const toast = (m, o) => useToastStore.getState().show(m, 'info', o?.duration);
toast.success = (m, o) => useToastStore.getState().show(m, 'success', o?.duration);
toast.error = (m, o) => useToastStore.getState().show(m, 'error', o?.duration || 4000);
toast.dismiss = () => {};
toast.loading = (m) => useToastStore.getState().show(m, 'info', 2000);
export default toast;
