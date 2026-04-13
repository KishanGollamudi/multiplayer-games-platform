# Multiplayer Games Platform

A microservices-based multiplayer platform with separate services for UNO, Blackjack, Chess, and Snakes & Ladders.

## What is included

- `frontend/`: React + Vite + Tailwind + Socket.IO client
- `backend/api-gateway/`: auth, profile, leaderboards, match history, REST proxies
- `backend/services/uno-service/`: real-time UNO with action cards and UNO call support
- `backend/services/cards-service/`: real-time Blackjack
- `backend/services/chess-service/`: standard chess rules using `chess.js`
- `backend/services/snakes-service/`: classic Snakes & Ladders with predefined snakes/ladders
- `backend/shared/`: PostgreSQL access, auth helpers, logging, middleware

## Chosen card game

The classic card game service is **Blackjack**. This keeps the full platform complete and runnable while still satisfying the requirement that Poker may be replaced with Blackjack if Poker is too large for the current scope.

## Ports

- API gateway: `3000`
- UNO service: `3001`
- Cards service: `3002`
- Chess service: `3003`
- Snakes service: `3004`
- Frontend: `5173`
- PostgreSQL: `5432`

## Setup

1. Copy env files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Install frontend dependencies:

```bash
cd frontend
npm install
```

3. Install backend workspace dependencies:

```bash
cd ../backend
npm install
```

4. Start backend services with Docker:

```bash
docker-compose up --build
```

5. Start frontend in another shell:

```bash
cd ../frontend
npm run dev
```

## Local backend scripts

If you want to run services without Docker:

```bash
cd backend/api-gateway && npm run dev
cd backend/services/uno-service && npm run dev
cd backend/services/cards-service && npm run dev
cd backend/services/chess-service && npm run dev
cd backend/services/snakes-service && npm run dev
```

## Gameplay features

- Guest login and registered accounts with JWT
- Profile, Elo-style ratings, per-game leaderboards, match history
- Private room creation and public queue matching
- Real-time game state and in-room chat over Socket.IO
- 30-second turn timers with server-side fallback actions
- Server-authoritative move validation
- Reusable glassmorphism UI with dark/light theme toggle
- Responsive views for desktop and mobile

## Tests

Critical logic tests are included:

```bash
cd backend/services/uno-service && npm test
cd backend/services/cards-service && npm test
cd backend/services/chess-service && npm test
cd backend/services/snakes-service && npm test
```

## Notes

- Socket connections currently go directly to each service port from the frontend.
- The API gateway handles shared auth/profile/leaderboard endpoints and REST proxying.
- Room state is stored in memory per service for live play, while users, ratings, and match history are persisted in PostgreSQL.
