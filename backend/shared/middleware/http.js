const rateLimit = require('express-rate-limit');
const { verifyToken } = require('../utils/auth');
const { findUserById } = require('../db');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const payload = verifyToken(token);
    const user = await findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
}

function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || 'Server error'
  });
}

module.exports = {
  apiLimiter,
  authMiddleware,
  errorHandler
};

