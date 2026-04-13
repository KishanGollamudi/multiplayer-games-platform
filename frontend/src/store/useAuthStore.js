import { create } from 'zustand';
import { fetchProfile, guestLogin, login, register } from '../services/api';

const persistedUser = JSON.parse(localStorage.getItem('mgp-user') || 'null');
const persistedToken = localStorage.getItem('mgp-token');

export const useAuthStore = create((set, get) => ({
  user: persistedUser,
  token: persistedToken,
  loading: false,
  async register(values) {
    set({ loading: true });
    const data = await register(values);
    localStorage.setItem('mgp-token', data.token);
    localStorage.setItem('mgp-user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, loading: false });
  },
  async login(values) {
    set({ loading: true });
    const data = await login(values);
    localStorage.setItem('mgp-token', data.token);
    localStorage.setItem('mgp-user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, loading: false });
  },
  async guestLogin() {
    set({ loading: true });
    const data = await guestLogin();
    localStorage.setItem('mgp-token', data.token);
    localStorage.setItem('mgp-user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, loading: false });
  },
  async refresh() {
    const { token } = get();
    if (!token) {
      return;
    }
    const data = await fetchProfile(token);
    localStorage.setItem('mgp-user', JSON.stringify(data.user));
    set({ user: data.user });
  },
  logout() {
    localStorage.removeItem('mgp-token');
    localStorage.removeItem('mgp-user');
    set({ user: null, token: null });
  }
}));
