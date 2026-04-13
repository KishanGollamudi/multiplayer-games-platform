import { useAppStore } from '../store/useAppStore';

export default function Toasts() {
  const toasts = useAppStore((state) => state.toasts);
  return (
    <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="glass rounded-2xl px-4 py-3 text-sm">
          <div className="font-semibold">{toast.title}</div>
          {toast.message ? <div className="mt-1 text-white/70">{toast.message}</div> : null}
        </div>
      ))}
    </div>
  );
}
