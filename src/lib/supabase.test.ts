import { createSupabaseClient } from './supabase';

// In-memory SecureStore so a "restart" (new client) reads what the previous one stored.
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));

const URL = 'https://abcdefghijklmnop.supabase.co';
const KEY = 'sb_publishable_test';
const STORAGE_KEY = 'sb-abcdefghijklmnop-auth-token';

function savedSession() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'header.payload.signature',
    refresh_token: 'refresh-1',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'owner@truefit.test',
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

describe('Supabase session storage (A7)', () => {
  beforeEach(() => mockStore.clear());

  it('restores a saved session after an app restart, without the network', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    // A previous run signed in and the client saved the session in SecureStore.
    mockStore.set(STORAGE_KEY, JSON.stringify(savedSession()));

    const afterRestart = createSupabaseClient(URL, KEY);
    const { data, error } = await afterRestart.auth.getSession();

    expect(error).toBeNull();
    expect(data.session?.user.email).toBe('owner@truefit.test');
    expect(data.session?.refresh_token).toBe('refresh-1');
    expect(fetchSpy).not.toHaveBeenCalled();
    afterRestart.auth.stopAutoRefresh();
    fetchSpy.mockRestore();
  });

  it('has no session on a fresh install', async () => {
    const client = createSupabaseClient(URL, KEY);
    const { data } = await client.auth.getSession();
    expect(data.session).toBeNull();
    client.auth.stopAutoRefresh();
  });
});
