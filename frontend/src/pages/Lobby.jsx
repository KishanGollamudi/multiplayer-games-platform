import { useEffect, useState } from 'react';
import Button from '../components/Button';
import GameCard from '../components/GameCard';
import ThemeToggle from '../components/ThemeToggle';
import { games } from '../services/games';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';

export default function Lobby() {
  const { user, login, register, guestLogin, loading, logout } = useAuthStore();
  const pushToast = useAppStore((state) => state.pushToast);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '' });

  // Sync user to localStorage whenever it changes (login, register, guest)
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      // If the store also provides a token, store it; otherwise use a placeholder
      // (Assumes token is available in store – if not, you may need to fetch it)
      // Many stores expose token separately; we'll check if there's a getToken method.
      // For simplicity, we'll try to retrieve token from localStorage if already set,
      // or set a dummy token. In production, your store should provide a real JWT.
      const existingToken = localStorage.getItem('token');
      if (!existingToken) {
        // If your backend guest login returns a token, you'd store it here.
        // This is a fallback to prevent game pages from failing.
        localStorage.setItem('token', 'guest-token');
      }
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      pushToast({ title: `Welcome ${user.username}`, message: 'Choose a game or review your profile and leaderboards.' });
    }
  }, [user, pushToast]);

  const submit = async () => {
    try {
      if (mode === 'register') {
        await register(form);
      } else {
        await login(form);
      }
    } catch (error) {
      pushToast({ title: 'Authentication failed', message: error.response?.data?.message || error.message });
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="glass flex flex-col gap-5 rounded-[32px] p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/55">Multiplayer Games Platform</p>
            <h1 className="mt-3 font-display text-4xl md:text-5xl">Real-time rooms. Four services. One lobby.</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <Button onClick={logout} className="bg-rose-500/60">
                Logout
              </Button>
            ) : null}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="grid gap-6 md:grid-cols-2">
            {games.map((game) => (
              <GameCard key={game.key} game={game} />
            ))}
          </div>

          <div className="glass rounded-[32px] p-6">
            <h2 className="font-display text-2xl">{user ? `Logged in as ${user.username}` : 'Join the platform'}</h2>
            {!user ? (
              <div className="mt-5 space-y-3">
                <div className="flex gap-2">
                  <Button onClick={() => setMode('login')} className={mode === 'login' ? 'bg-emerald-500/70' : ''}>
                    Login
                  </Button>
                  <Button onClick={() => setMode('register')} className={mode === 'register' ? 'bg-emerald-500/70' : ''}>
                    Register
                  </Button>
                </div>
                <input
                  className="w-full rounded-2xl bg-white/10 px-4 py-3 outline-none"
                  placeholder="Username"
                  value={form.username}
                  onChange={(event) => setForm((state) => ({ ...state, username: event.target.value }))}
                />
                <input
                  className="w-full rounded-2xl bg-white/10 px-4 py-3 outline-none"
                  placeholder="Password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
                />
                <Button className="w-full bg-cyan-500/60" onClick={submit} disabled={loading}>
                  {mode === 'login' ? 'Login' : 'Create account'}
                </Button>
                <Button className="w-full bg-white/10" onClick={async () => {
                  await guestLogin();
                  // After guestLogin, the useEffect will sync user to localStorage automatically.
                  // However, some game pages may need a real token from backend.
                  // If your guestLogin doesn't return a token, you might want to fetch one.
                  // Optionally, force a page reload to ensure all contexts refresh.
                  // Uncomment the next line if needed:
                  // window.location.reload();
                }}>
                  Continue as guest
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-4 text-sm text-white/75">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="font-semibold text-white">Avatar</div>
                  <div className="mt-2">{user.avatar_url || user.avatarUrl || 'Auto-assigned avatar'}</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="font-semibold text-white">Ratings</div>
                  <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(user.ratings || {}, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
