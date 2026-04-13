import { useEffect, useState } from 'react';
import { fetchMatches, fetchProfile } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export default function Profile() {
  const { token, user } = useAuthStore();
  const [profile, setProfile] = useState(user);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchProfile(token).then((data) => setProfile(data.user));
    fetchMatches(token).then(setMatches);
  }, [token]);

  if (!token) {
    return <div className="mx-auto max-w-5xl p-8 text-sm">Login first to see profile and match history.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="glass rounded-[32px] p-6">
        <h1 className="font-display text-3xl">Profile</h1>
        <p className="mt-2 text-white/70">{profile?.username}</p>
        <pre className="mt-4 overflow-auto rounded-2xl bg-black/20 p-4 text-xs">{JSON.stringify(profile?.ratings || {}, null, 2)}</pre>
      </div>
      <div className="glass rounded-[32px] p-6">
        <h2 className="font-display text-2xl">Recent Matches</h2>
        <div className="mt-4 space-y-3">
          {matches.map((match) => (
            <div key={match.id} className="rounded-2xl bg-white/5 p-4 text-sm">
              <div className="font-semibold">{match.game_key}</div>
              <div className="text-white/70">Room {match.room_code}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
