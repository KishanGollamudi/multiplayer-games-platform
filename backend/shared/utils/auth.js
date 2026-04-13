const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { env } = require('../config/env');

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      isGuest: user.is_guest ?? user.isGuest ?? false
    },
    env.jwtSecret,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  signToken,
  verifyToken,
  hashPassword,
  comparePassword
};

