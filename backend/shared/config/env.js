const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function readEnv(key, fallback) {
  return process.env[key] || fallback;
}

const env = {
  nodeEnv: readEnv('NODE_ENV', 'development'),
  port: Number(readEnv('PORT', 3000)),
  jwtSecret: readEnv('JWT_SECRET', 'super-secret-key'),
  postgres: {
    host: readEnv('POSTGRES_HOST', 'localhost'),
    port: Number(readEnv('POSTGRES_PORT', 5432)),
    database: readEnv('POSTGRES_DB', 'multiplayer_games'),
    user: readEnv('POSTGRES_USER', 'postgres'),
    password: readEnv('POSTGRES_PASSWORD', 'postgres')
  },
  clientUrl: readEnv('CLIENT_URL', 'http://localhost:5173'),
  services: {
    uno: readEnv('UNO_SERVICE_URL', 'http://localhost:3001'),
    cards: readEnv('CARDS_SERVICE_URL', 'http://localhost:3002'),
    chess: readEnv('CHESS_SERVICE_URL', 'http://localhost:3003'),
    snakes: readEnv('SNAKES_SERVICE_URL', 'http://localhost:3004'),
    rummy: readEnv('RUMMY_SERVICE_URL', 'http://localhost:3005')
  }
};

module.exports = { env };
