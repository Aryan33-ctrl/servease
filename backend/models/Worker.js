const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true
  },
  skills: [{
    type: String
  }],
  rating: {
    type: Number,
    default: 0
  },
  pricePerHour: {
    type: Number,
    required: true,
    default: 0
  },
  available: {
    type: Boolean,
    default: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0] // [longitude, latitude]
    }
  },
  lastLocationUpdate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Configure 2dsphere index for geospatial queries
WorkerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Worker', WorkerSchema);
