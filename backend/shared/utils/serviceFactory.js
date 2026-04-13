const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { env } = require('../config/env');
const { apiLimiter } = require('../middleware/http');
const { attachSocketAuth } = require('../middleware/socket');
const { log } = require('./logger');

function createGameService({ name, port, router, registerSockets }) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json());
  app.use(apiLimiter);
  app.get('/health', (req, res) => {
    res.json({ service: name, ok: true });
  });
  if (router) {
    app.use('/api', router);
  }

  attachSocketAuth(io);
  registerSockets(io);

  return {
    app,
    io,
    start() {
      server.listen(port, () => {
        log(name, `listening on ${port}`);
      });
    }
  };
}

module.exports = { createGameService };
