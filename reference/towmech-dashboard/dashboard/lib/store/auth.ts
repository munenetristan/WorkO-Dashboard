import { create } from "zustand";

const TOKEN_KEY = "towmech_token";
const USER_KEY = "towmech_user";

export type AuthUser = {
  _id: string;
  name?: string;
  email: string;
  role: "SuperAdmin" | "Admin" | string;
  permissions?: Record<string, boolean>;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isHydrated: boolean;

  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  hydrate: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrated: false,

  setAuth: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    set({ token, user });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    set({ token: null, user: null });
  },

  hydrate: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);
      const userStr = localStorage.getItem(USER_KEY);
      const user = userStr ? JSON.parse(userStr) : null;

      set({ token, user, isHydrated: true });
    } else {
      set({ isHydrated: true });
    }
  },
}));
