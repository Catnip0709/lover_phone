import type { AuthResponse, AuthUser } from "@myphone/shared";
import { create } from "zustand";
import { fetchMe, logout as requestLogout } from "@/api/auth";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  bootstrapped: boolean;
  setAuth: (response: AuthResponse) => void;
  setUser: (user: AuthUser) => void;
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
};

const ACCESS_TOKEN_KEY = "myphone_access_token";
const REFRESH_TOKEN_KEY = "myphone_refresh_token";

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  user: null,
  bootstrapped: false,

  setAuth: (response) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    set({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
      bootstrapped: true,
    });
  },

  setUser: (user) => set({ user }),

  bootstrap: async () => {
    const token = get().accessToken;

    if (!token) {
      set({ bootstrapped: true, user: null });
      return;
    }

    try {
      const user = await fetchMe(token);
      set({ user, bootstrapped: true });
    } catch {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        bootstrapped: true,
      });
    }
  },

  logout: async () => {
    const refreshToken = get().refreshToken;

    if (refreshToken) {
      await requestLogout(refreshToken).catch(() => undefined);
    }

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      bootstrapped: true,
    });
  },
}));
