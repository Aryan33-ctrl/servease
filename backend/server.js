require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const isVercel = Boolean(process.env.VERCEL);
const enableSockets = !isVercel && process.env.ENABLE_SOCKETS !== 'false';

const explicitAllowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'].filter(Boolean);

const isDevLocalOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  // Do not count token validation/logout calls as auth attempts.
  skip: (req) => ['/verify-token', '/logout', '/forgot-password', '/reset-password'].includes(req.path),
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later.'
    });
  }
});

// Middleware
app.use(limiter);
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin || explicitAllowedOrigins.includes(origin) || isDevLocalOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true
}));
app.use(express.json());

// Add logging middleware for debugging auth requests
app.use((req, res, next) => {
  if (req.path.includes('/api/auth')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | Body:`, req.body);
  }
  next();
});

if (enableSockets) {
  // Socket.io Setup
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || explicitAllowedOrigins.includes(origin) || isDevLocalOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Not allowed by Socket CORS: ${origin}`));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true // Crucial for cookie/auth header handshakes in production
    }
  });

  // Make io available in routes
  app.set('io', io);

  // Socket Logic Hardening
  require('./sockets/index')(io);
} else {
  app.set('io', null);
}

// Database Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Basic Route
app.get('/', (req, res) => {
  res.send('ServEase API is running');
});

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/workers', require('./routes/workers'));

if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.resolve(__dirname, '../frontend/dist');

  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }

      return res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  } else {
    console.warn('Frontend build not found. Run `npm run build:frontend` before starting in production.');
  }
}

// Import and use global error handler BEFORE starting server, but AFTER routes
const errorHandler = require('./middleware/error');
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

const PORT = Number(process.env.PORT) || 5001;
const isDev = process.env.NODE_ENV !== 'production';
const MAX_DEV_PORT_ATTEMPTS = 5;
let activePort = PORT;
let devPortAttempts = 0;

// Handle server startup issues (e.g., port already in use) with actionable logs.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    if (isDev) {
      if (devPortAttempts < MAX_DEV_PORT_ATTEMPTS) {
        devPortAttempts += 1;
        activePort += 1;
        console.warn(`Port ${activePort - 1} is already in use. Retrying on port ${activePort}...`);
        server.listen(activePort);
        return;
      }

      console.error(`Could not find a free port after ${MAX_DEV_PORT_ATTEMPTS} attempts. Stop the existing process or set a different PORT in backend/.env.`);
      process.exit(1);
      return;
    }
    console.error(`Port ${PORT} is already in use. Stop the existing process or set a different PORT in backend/.env.`);
  } else if (err.code === 'EACCES') {
    console.error(`Port ${activePort} requires elevated privileges. Choose another port or run with proper permissions.`);
  } else {
    console.error('Server startup error:', err);
  }
  process.exit(1);
});

if (require.main === module && !isVercel) {
  server.listen(activePort, () => {
    console.log(`Server running on port ${activePort}`);
  });
}

const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    mongoose.connection.close(false)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = app;
  