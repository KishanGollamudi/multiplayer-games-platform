import { useState } from 'react';
import Button from './Button';

export default function ChatPanel({ roomCode, chat = [], onSend }) {
  const [text, setText] = useState('');

  return (
    <div className="glass rounded-[28px] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl">Room Chat</h3>
        <span className="text-xs uppercase tracking-[0.25em] text-white/50">{roomCode || 'Idle'}</span>
      </div>
      <div className="mb-4 h-56 space-y-3 overflow-y-auto rounded-2xl bg-black/20 p-3">
        {chat.map((message) => (
          <div key={message.id} className="rounded-2xl bg-white/5 px-3 py-2 text-sm">
            <div className="font-semibold">{message.username}</div>
            <div className="text-white/75">{message.text}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-2xl bg-white/10 px-4 py-3 outline-none"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a message"
        />
        <Button
          onClick={() => {
            if (!text.trim()) {
              return;
            }
            onSend(text);
            setText('');
          }}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
