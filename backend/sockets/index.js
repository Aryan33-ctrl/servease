const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
    console.log(`[Socket] Authorized Connection: ${socket.user.name} (${socket.user.role}) [ID: ${socket.id}]`);

    // Join worker-specific room for hire notifications
    if (socket.user.role === 'worker') {
      socket.join(`worker_${socket.user.id}`);
    }

    // Join user-specific room for hire updates
    socket.join(`user_${socket.user.id}`);

    // Listen for hire response from worker
    socket.on('hireResponse', async (data) => {
      const { hireId, status, message } = data;
      try {
        const Hire = require('../models/Hire');
        const hire = await Hire.findById(hireId).populate('user', 'name email');
        if (hire && hire.worker.toString() === socket.user.id) {
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
        
        // Broadcast the accurately verified worker ID and updated location geoPoint back to all clients
        socket.broadcast.emit('worker-location-updated', {
          workerId: socket.user.id,
          location: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        });
      }
    });

    // Listen for worker status/availability updates
    socket.on('worker-status-changed', async (data) => {
      if (socket.user.role === 'worker') {
        try {
          const Worker = require('../models/Worker');
          const { available, lat, lng } = data;
          
          const update = { available };
          if (lat && lng) {
            update.location = {
              type: 'Point',
              coordinates: [lng, lat]
            };
            update.lastLocationUpdate = new Date();
          }
          
          const worker = await Worker.findByIdAndUpdate(socket.user.id, update, { new: true });
          
          // Broadcast to all clients
          socket.broadcast.emit('worker-status-updated', {
            workerId: worker._id,
            available: worker.available,
            location: worker.location
          });
        } catch (err) {
          console.error('Error updating worker status:', err);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.user.name} (${socket.id})`);
    });
  });
};
