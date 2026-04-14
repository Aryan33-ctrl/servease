const mongoose = require('mongoose');

const HireSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  worker: {
    type: mongoose.Schema.ObjectId,
    ref: 'Worker',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed'],
    default: 'pending'
  },
  message: {
    type: String,
    default: ''
  },
  userRating: {
    type: Number,
    min: 1,
    max: 5
  },
  userReview: {
    type: String,
    default: ''
  },
  ratedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Hire', HireSchema);