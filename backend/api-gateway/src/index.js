const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { env } = require('../../shared/config/env');
const {
  initDb,
  findUserByUsername,
  createUser,
  ensureRating,
  getRatings,
  getLeaderboard,
  getMatchHistory,
  getUserMatchHistory,
  findUserById
} = require('../../shared/db');
const { apiLimiter, authMiddleware, errorHandler } = require('../../shared/middleware/http');
const { hashPassword, comparePassword, signToken } = require('../../shared/utils/auth');
const { createGuestUsername, pickAvatar } = require('../../shared/utils/common');
const { log } = require('../../shared/utils/logger');

const app = express();
const server = http.createServer(app);
const registerSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(64)
});

const loginSchema = registerSchema;

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(apiLimiter);

app.get('/health', (req, res) => {
  res.json({ service: 'api-gateway', ok: true });
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await findUserByUsername(body.username);

    if (existing) {
      return res.status(409).json({ message: 'Username already taken.' });
    }

    const user = await createUser({
      id: uuidv4(),
      username: body.username,
      passwordHash: await hashPassword(body.password),
      isGuest: false,
      avatarUrl: pickAvatar(body.username)
    });

    await Promise.all(['uno', 'cards', 'chess', 'snakes', 'rummy'].map((game) => ensureRating(user.id, game)));

    const token = signToken(user);
    res.cookie('token', token, { httpOnly: false, sameSite: 'lax' });
    res.json({ token, user: { ...user, ratings: await getRatings(user.id) } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await findUserByUsername(body.username);

    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const valid = await comparePassword(body.password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = signToken(user);
    res.cookie('token', token, { httpOnly: false, sameSite: 'lax' });
    res.json({ token, user: { ...user, ratings: await getRatings(user.id) } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/guest', async (req, res, next) => {
  try {
    const username = createGuestUsername();
    const user = await createUser({
      id: uuidv4(),
      username,
      isGuest: true,
      avatarUrl: pickAvatar(username)
    });

    await Promise.all(['uno', 'cards', 'chess', 'snakes', 'rummy'].map((game) => ensureRating(user.id, game)));

    const token = signToken(user);
    res.cookie('token', token, { httpOnly: false, sameSite: 'lax' });
    res.json({ token, user: { ...user, ratings: await getRatings(user.id) } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/profile/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    res.json({
      user: {
        ...user,
        ratings: await getRatings(req.user.id),
        history: await getUserMatchHistory(req.user.id)
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/leaderboard/:gameKey', async (req, res, next) => {
  try {
    res.json({ entries: await getLeaderboard(req.params.gameKey, Number(req.query.limit || 20)) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/matches', authMiddleware, async (req, res, next) => {
  try {
    res.json({ entries: await getMatchHistory(Number(req.query.limit || 30)) });
  } catch (error) {
    next(error);
  }
});

const proxyConfig = [
  ['/api/uno', env.services.uno],
  ['/api/cards', env.services.cards],
  ['/api/chess', env.services.chess],
  ['/api/snakes', env.services.snakes],
  ['/api/rummy', env.services.rummy],
  ['/rummy', env.services.rummy]
];

for (const [path, target] of proxyConfig) {
  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      pathRewrite: (currentPath) => currentPath.replace(path, '/api')
    })
  );
}

app.use(errorHandler);

async function main() {
  await initDb();
  server.listen(env.port, () => {
    log('api-gateway', `listening on ${env.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
