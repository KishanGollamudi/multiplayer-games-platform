import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../services/api';
import { games } from '../services/games';

export default function Leaderboard() {
  const [activeGame, setActiveGame] = useState('uno');
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    fetchLeaderboard(activeGame).then(setEntries);
  }, [activeGame]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="glass rounded-[32px] p-6">
        <h1 className="font-display text-3xl">Leaderboards</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          {games.map((game) => (
            <button
              key={game.key}
              onClick={() => setActiveGame(game.key)}
              className={`rounded-full px-4 py-2 text-sm ${activeGame === game.key ? 'bg-emerald-500/70' : 'bg-white/10'}`}
            >
              {game.title}
            </button>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {entries.map((entry, index) => (
            <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
              <div>
                <div className="font-semibold">
                  #{index + 1} {entry.username}
                </div>
                <div className="text-sm text-white/60">{entry.avatar_url || 'Avatar assigned'}</div>
              </div>
              <div className="text-lg font-bold">{entry.elo}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
