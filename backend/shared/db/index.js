const { Pool } = require('pg');
const { env } = require('../config/env');

const pool = new Pool(env.postgres);

const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  is_guest BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_key VARCHAR(30) NOT NULL,
  elo INTEGER DEFAULT 1200,
  UNIQUE(user_id, game_key)
);

CREATE TABLE IF NOT EXISTS match_history (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(20) NOT NULL,
  game_key VARCHAR(30) NOT NULL,
  payload JSONB NOT NULL,
  winners JSONB NOT NULL,
  participants JSONB NOT NULL,
  played_at TIMESTAMP DEFAULT NOW()
);
`;

async function initDb() {
  await pool.query(schemaSql);
}

async function findUserByUsername(username) {
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1 LIMIT 1', [username]);
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return rows[0] || null;
}

async function createUser(user) {
  const { id, username, passwordHash, isGuest, avatarUrl } = user;
  await pool.query(
    `INSERT INTO users (id, username, password_hash, is_guest, avatar_url)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, username, passwordHash || null, Boolean(isGuest), avatarUrl || null]
  );
  return findUserById(id);
}

async function ensureRating(userId, gameKey) {
  await pool.query(
    `INSERT INTO ratings (user_id, game_key, elo)
     VALUES ($1, $2, 1200)
     ON CONFLICT (user_id, game_key) DO NOTHING`,
    [userId, gameKey]
  );
}

async function getRatings(userId) {
  const { rows } = await pool.query('SELECT game_key, elo FROM ratings WHERE user_id = $1', [userId]);
  return rows.reduce((acc, row) => {
    acc[row.game_key] = row.elo;
    return acc;
  }, {});
}

async function getLeaderboard(gameKey, limit = 20) {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.avatar_url, r.elo
     FROM ratings r
     JOIN users u ON u.id = r.user_id
     WHERE r.game_key = $1
     ORDER BY r.elo DESC, u.created_at ASC
     LIMIT $2`,
    [gameKey, limit]
  );
  return rows;
}

async function getMatchHistory(limit = 30) {
  const { rows } = await pool.query(
    `SELECT * FROM match_history
     ORDER BY played_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function getUserMatchHistory(userId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT *
     FROM match_history
     WHERE participants::text ILIKE $1
     ORDER BY played_at DESC
     LIMIT $2`,
    [`%${userId}%`, limit]
  );
  return rows;
}

function expectedScore(a, b) {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

async function updateRatings(gameKey, rankedResults) {
  const users = [];

  for (const result of rankedResults) {
    await ensureRating(result.userId, gameKey);
    const { rows } = await pool.query(
      'SELECT elo FROM ratings WHERE user_id = $1 AND game_key = $2 LIMIT 1',
      [result.userId, gameKey]
    );
    users.push({ ...result, elo: rows[0]?.elo ?? 1200 });
  }

  for (const current of users) {
    const peers = users.filter((peer) => peer.userId !== current.userId);
    let delta = 0;

    for (const peer of peers) {
      const actual = current.rank < peer.rank ? 1 : current.rank === peer.rank ? 0.5 : 0;
      const expected = expectedScore(current.elo, peer.elo);
      delta += 24 * (actual - expected);
    }

    const nextElo = Math.max(100, Math.round(current.elo + delta));
    await pool.query(
      'UPDATE ratings SET elo = $1 WHERE user_id = $2 AND game_key = $3',
      [nextElo, current.userId, gameKey]
    );
  }
}

async function saveMatchHistory(entry) {
  await pool.query(
    `INSERT INTO match_history (room_code, game_key, payload, winners, participants)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      entry.roomCode,
      entry.gameKey,
      JSON.stringify(entry.payload),
      JSON.stringify(entry.winners),
      JSON.stringify(entry.participants)
    ]
  );
}

module.exports = {
  pool,
  initDb,
  findUserByUsername,
  findUserById,
  createUser,
  ensureRating,
  getRatings,
  getLeaderboard,
  getMatchHistory,
  getUserMatchHistory,
  updateRatings,
  saveMatchHistory
};

