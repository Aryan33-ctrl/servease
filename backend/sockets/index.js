const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');

module.exports = (io) => {
  // Socket Middleware for Authentication Context
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      
      if (!token) {
        return next(new Error('Authentication Error: Bearer Token missing'));
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Look up user completely
      const user = await User.findById(decoded.user.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication Error: User no longer exists'));
      }

      // Attach global user context to this specific socket boundary
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication Error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] ✅ New connection: ${socket.user.name} (${socket.user.role}) [Socket ID: ${socket.id}]`);

    // Join worker-specific room for hire notifications
    if (socket.user.role === 'worker') {
      Worker.findOne({ user: socket.user.id }).select('_id').then((workerProfile) => {
        if (workerProfile) {
          socket.join(`worker_${workerProfile._id}`);
          console.log(`[Socket] 👤 Worker ${socket.user.name} joined room: worker_${workerProfile._id}`);
        } else {
          console.warn(`[Socket] ⚠️ Worker profile not found for user ${socket.user.name}`);
        }
      }).catch((err) => {
        console.error('[Socket] Error joining worker room:', err.message);
      });
    }

    // Join user-specific room for hire updates
    socket.join(`user_${socket.user.id}`);
    console.log(`[Socket] 📬 Joined user room: user_${socket.user.id}`);

    // Listen for hire response from worker
    socket.on('hireResponse', async (data) => {
      const { hireId, status, message } = data;
      try {
        const Hire = require('../models/Hire');
        const workerProfile = await Worker.findOne({ user: socket.user.id }).select('_id');
        if (!workerProfile) {
          return;
        }
        const hire = await Hire.findById(hireId).populate('user', 'name email');
        if (hire && hire.worker.toString() === workerProfile._id.toString()) {
          hire.status = status;
          if (message) hire.message = message;
          await hire.save();

          // Notify the user who made the hire request
          socket.to(`user_${hire.user._id}`).emit('hireUpdate', {
            hireId: hire._id,
            status: hire.status,
            workerName: socket.user.name,
            message: hire.message
          });
        }
      } catch (err) {
        console.error('Error handling hire response:', err);
      }
    });

    // Listen for specialized real-time location updates
    socket.on('update-location', (data) => {
      // Security: Only allow workers to physically broadcast location updates, users cannot spoof this event!
      if (socket.user.role === 'worker') {
        const { lat, lng } = data;
        console.log(`[Socket] 📍 Received location update from worker ${socket.user.name}: ${lat}, ${lng}`);
        
        Worker.findOneAndUpdate(
          { user: socket.user.id },
          {
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            lastLocationUpdate: new Date()
          },
          { new: true }
        ).then((worker) => {
          if (!worker) {
            console.error(`[Socket] ❌ Worker profile not found for user ${socket.user.id}`);
            return;
          }
          
          console.log(`[Socket] 💾 Updated worker ${worker._id} location in DB`);
          console.log(`[Socket] 📡 Broadcasting worker-location-updated to all clients`);
          
          // Broadcast the accurately verified worker profile ID and updated location geoPoint.
          socket.broadcast.emit('worker-location-updated', {
            workerId: worker._id,
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            }
          });
        }).catch((err) => {
          console.error('[Socket] Error updating worker location:', err.message);
        });
      } else {
        console.warn(`[Socket] ⚠️ Non-worker user ${socket.user.name} tried to emit update-location`);
      }
    });

    // Listen for worker status/availability updates
    socket.on('worker-status-changed', async (data) => {
      if (socket.user.role === 'worker') {
        try {
          const Worker = require('../models/Worker');
          const { available, lat, lng } = data;
          
          console.log(`[Socket] 🔄 Worker ${socket.user.name} status update: available=${available}, location=${lat},${lng}`);
          
          const update = { available };
          if (lat && lng) {
            update.location = {
              type: 'Point',
              coordinates: [lng, lat]
            };
            update.lastLocationUpdate = new Date();
            console.log(`[Socket] 📍 Updating location for worker ${socket.user.name}`);
          }
          
          const worker = await Worker.findOneAndUpdate({ user: socket.user.id }, update, { new: true });
          if (!worker) {
            console.warn(`[Socket] ⚠️ Worker profile not found for user ${socket.user.name}`);
            return;
          }
          
          console.log(`[Socket] 📡 Broadcasting worker-availability-changed`);
          // Broadcast to all clients
          socket.broadcast.emit('worker-availability-changed', {
            workerId: worker._id,
            available: worker.available,
            location: worker.location
          });
        } catch (err) {
          console.error('[Socket] Error updating worker status:', err.message);
        }
      } else {
        console.warn(`[Socket] ⚠️ Non-worker user ${socket.user.name} tried to emit worker-status-changed`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.user.name} (${socket.id})`);
    });
  });
};
