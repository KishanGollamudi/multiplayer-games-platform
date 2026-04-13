import { Link } from 'react-router-dom';

export default function GameCard({ game }) {
  return (
    <Link
      to={`/game/${game.key}`}
      className={`glass group relative overflow-hidden rounded-[28px] p-6 transition hover:-translate-y-1 ${game.key === 'chess' ? 'md:col-span-2' : ''}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${game.accent}`} />
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">{game.subtitle}</p>
        <h3 className="mt-3 font-display text-3xl">{game.title}</h3>
        <p className="mt-3 max-w-sm text-sm text-white/75">{game.description}</p>
        <div className="mt-6 text-sm font-semibold text-emerald-300">Open room</div>
      </div>
    </Link>
  );
}
