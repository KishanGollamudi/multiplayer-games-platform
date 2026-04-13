import { MoonStar, SunMedium } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function ThemeToggle() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="glass rounded-full p-3"
      type="button"
    >
      {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
    </button>
  );
}
