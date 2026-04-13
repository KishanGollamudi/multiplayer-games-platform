export default function Modal({ title, children, open, onClose }) {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="glass w-full max-w-md rounded-[32px] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl">{title}</h3>
          <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1 text-sm">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
