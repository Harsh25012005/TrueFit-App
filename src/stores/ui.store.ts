import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
  action?: ToastAction;
}

interface UiState {
  /** One toast at a time; a new one replaces the current (DESIGN.md §6.8). */
  toast: ToastMessage | null;
  showToast: (toast: Omit<ToastMessage, 'id' | 'kind'> & { kind?: ToastKind }) => void;
  hideToast: (id?: number) => void;
}

let nextId = 1;

export const useUiStore = create<UiState>((set, get) => ({
  toast: null,
  showToast: ({ kind = 'info', ...toast }) => set({ toast: { id: nextId++, kind, ...toast } }),
  hideToast: (id) => {
    if (id === undefined || get().toast?.id === id) set({ toast: null });
  },
}));

/** Show a toast from anywhere (hooks, repos, sync). */
export const showToast = (toast: Parameters<UiState['showToast']>[0]) =>
  useUiStore.getState().showToast(toast);
