import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Toasts from './components/Toast';
import { useAppStore } from './store/useAppStore';

function Shell({ children }) {
  const theme = useAppStore((state) => state.theme);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return (
    <div className={theme === 'light' ? 'light' : ''}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link className="font-display text-xl" to="/">
          MGP
        </Link>
        <div className="flex gap-3 text-sm text-white/70">
          <Link className={location.pathname === '/' ? 'text-white' : ''} to="/">
            Lobby
          </Link>
          <Link className={location.pathname === '/profile' ? 'text-white' : ''} to="/profile">
            Profile
          </Link>
          <Link className={location.pathname === '/leaderboard' ? 'text-white' : ''} to="/leaderboard">
            Leaderboard
          </Link>
        </div>
      </nav>
      {children}
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/game/:gameKey" element={<GameRoom />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </Shell>
  );
}
