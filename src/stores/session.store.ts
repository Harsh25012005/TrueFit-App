import { create } from 'zustand';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';
export type AuthProvider = 'email' | 'google';

export interface SessionUser {
  userId: string;
  email: string | null;
  provider: AuthProvider;
  emailConfirmed: boolean;
}

/** unknown = still checking · none = signed in, setup not finished · ready = shop loaded. */
export type ShopState = 'unknown' | 'none' | 'ready';

interface SessionState {
  status: AuthStatus;
  user: SessionUser | null;
  shopState: ShopState;
  shopId: string | null;
  /** App PIN is set on this phone (M3). */
  hasPin: boolean;
  /** PIN lock screen is required before showing shop data. */
  locked: boolean;
  setSignedIn: (user: SessionUser) => void;
  setSignedOut: () => void;
  setShop: (shopId: string | null) => void;
  setHasPin: (hasPin: boolean) => void;
  setLocked: (locked: boolean) => void;
}

/** Session/auth state (ARCHITECTURE.md §4). Tokens themselves stay in SecureStore. */
export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'loading',
  user: null,
  shopState: 'unknown',
  shopId: null,
  hasPin: false,
  locked: false,
  setSignedIn: (user) =>
    set(
      get().user?.userId === user.userId
        ? { status: 'signedIn', user }
        : { status: 'signedIn', user, shopState: 'unknown', shopId: null },
    ),
  setSignedOut: () =>
    set({ status: 'signedOut', user: null, shopState: 'unknown', shopId: null, locked: false }),
  setShop: (shopId) => set({ shopId, shopState: shopId ? 'ready' : 'none' }),
  setHasPin: (hasPin) => set({ hasPin }),
  setLocked: (locked) => set({ locked }),
}));
