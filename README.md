# ServEase

ServEase is a modern SaaS platform designed to connect users with skilled professionals in real-time. It uses dynamic AI rating to rank workers based on distance, price, and quality, displaying them on a live interactive map.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, React Router, Socket.io-client, Google Maps API
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT Authentication
- **AI Recommendation Engine**: Algorithm utilizing Haversine distance, worker ratings, and dynamic pricing metrics.

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally (default URI `mongodb://127.0.0.1:27017/servease`) or change `MONGO_URI` in `backend/.env`.
- Google Maps API Key: set `VITE_GOOGLE_MAPS_API_KEY` in the frontend environment before building.

### 2. Installation
Open a terminal in the root directory and install all dependencies for both frontend and backend:
```bash
npm run install-all
```

### 3. Production Environment
Create `backend/.env` with values like:
```bash
NODE_ENV=production
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/servease
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5001
```

Create `frontend/.env.local` with:
```bash
VITE_API_URL=http://localhost:5001
VITE_GOOGLE_MAPS_API_KEY=replace-with-your-key
```

### 4. Run Development Servers
To start both the Node.js backend and the React frontend concurrently:
```bash
npm start
```
- Frontend runs at: `http://localhost:5173`
- Backend API runs at: `http://localhost:5001`

### 5. Build For Production
Build the frontend and start the backend in production mode:
```bash
npm run build:frontend
npm start
```
In production, the backend serves the built frontend from `frontend/dist`.

### 6. Create Mock Data
You can mock up some workers into your local database by running:
```bash
curl -X POST http://localhost:5001/api/workers/seed \
-H 'Content-Type: application/json' \
-d '{"name":"John Fixer","skills":["Plumbing", "Carpentry"],"rating":4.8,"pricePerHour":45,"lat":37.7749,"lng":-122.4194}'
```
Or create them manually through the API.
