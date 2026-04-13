const { randomUUID } = require('crypto');

function createRoomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  while (code.length < length) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function sanitizePlayer(user) {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatar_url || user.avatarUrl || null,
    isGuest: user.is_guest ?? user.isGuest ?? false
  };
}

function pickAvatar(seed) {
  const variants = [
    'https://api.dicebear.com/8.x/bottts/svg?seed=rook',
    'https://api.dicebear.com/8.x/bottts/svg?seed=wild',
    'https://api.dicebear.com/8.x/bottts/svg?seed=dice',
    'https://api.dicebear.com/8.x/bottts/svg?seed=ace'
  ];
  return variants[seed.length % variants.length];
}

function nowPlus(seconds) {
  return Date.now() + seconds * 1000;
}

function structuredCloneLite(value) {
  return JSON.parse(JSON.stringify(value));
}

function createGuestUsername() {
  return `guest_${randomUUID().slice(0, 8)}`;
}

module.exports = {
  createRoomCode,
  sanitizePlayer,
  pickAvatar,
  nowPlus,
  structuredCloneLite,
  createGuestUsername
};

