const { verifyToken } = require('../utils/auth');
const { findUserById } = require('../db');

function attachSocketAuth(io) {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '') ||
        null;

      if (!token) {
        return next(new Error('Missing token'));
      }

      const payload = verifyToken(token);
      const user = await findUserById(payload.sub);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatar_url,
        isGuest: user.is_guest
      };
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });
}

module.exports = { attachSocketAuth };

