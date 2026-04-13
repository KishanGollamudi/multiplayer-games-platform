import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true
});

export async function register(payload) {
  const { data } = await api.post('/api/auth/register', payload);
  return data;
}

export async function login(payload) {
  const { data } = await api.post('/api/auth/login', payload);
  return data;
}

export async function guestLogin() {
  const { data } = await api.post('/api/auth/guest');
  return data;
}

export async function fetchProfile(token) {
  const { data } = await api.get('/api/profile/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

export async function fetchLeaderboard(gameKey) {
  const { data } = await api.get(`/api/leaderboard/${gameKey}`);
  return data.entries;
}

export async function fetchMatches(token) {
  const { data } = await api.get('/api/matches', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data.entries;
}

export default api;
