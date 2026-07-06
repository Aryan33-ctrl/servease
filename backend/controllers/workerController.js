const Worker = require('../models/Worker');
const Hire = require('../models/Hire');
const { sendSuccess } = require('../utils/response');

const normalizeSearchTerm = (term) => {
  if (!term) return term;
  const normalized = term.trim().toLowerCase();
  const aliases = {
    plumber: 'plumbing',
    electrician: 'electrical',
    painter: 'painting',
    carpenter: 'carpentry',
    hvac: 'hvac',
    cooling: 'hvac',
    heating: 'hvac',
    cleaner: 'cleaning',
    janitor: 'cleaning',
    handyman: 'repairs'
  };
  return aliases[normalized] || normalized;
};

exports.getWorkers = async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      search,
      minRating,
      maxPrice,
      available,
      sortBy,
      sortOrder
    } = req.query;
    const rawSearch = normalizeSearchTerm(search);

    const searchConditions = [];

    if (rawSearch) {
      searchConditions.push(
        { skills: { $regex: rawSearch, $options: 'i' } },
        { name: { $regex: rawSearch, $options: 'i' } }
      );
    }

    const minRatingValue = minRating ? parseFloat(minRating) : null;
    const maxPriceValue = maxPrice ? parseFloat(maxPrice) : null;

    const filterConditions = [];

    if (searchConditions.length) {
      filterConditions.push({ $or: searchConditions });
    }

    if (minRatingValue !== null && !Number.isNaN(minRatingValue)) {
      filterConditions.push({ rating: { $gte: minRatingValue } });
    }

    if (maxPriceValue !== null && !Number.isNaN(maxPriceValue)) {
      filterConditions.push({ pricePerHour: { $lte: maxPriceValue } });
    }

    if (available === 'true') {
      filterConditions.push({ available: true });
    }

    const order = sortOrder === 'asc' ? 1 : -1;
    const sortConfig = {};

    if (sortBy === 'distance') {
      sortConfig.distance = order;
    } else if (sortBy === 'rating') {
      sortConfig.rating = order;
    } else if (sortBy === 'pricePerHour') {
      sortConfig.pricePerHour = order;
    } else {
      sortConfig.aiScore = order;
      sortConfig.distance = 1;
      sortConfig.rating = -1;
      sortConfig.pricePerHour = 1;
    }

    if (!lat || !lng) {
      const filter = filterConditions.length ? { $and: filterConditions } : {};
      const workers = await Worker.find(filter)
        .sort(sortConfig)
        .limit(20);
      return sendSuccess(res, workers, 'Workers retrieved successfully');
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [userLng, userLat]
          },
          distanceField: 'distance',
          maxDistance: 100000,
          spherical: true
        }
      }
    ];

    if (filterConditions.length) {
      pipeline.push({ $match: { $and: filterConditions } });
    }

    pipeline.push(
      {
        $addFields: {
          availabilityScore: {
            $cond: ['$available', 1000, -1000]
          },
          aiScore: {
            $subtract: [
              {
                $add: [
                  { $multiply: ['$rating', 20] },
                  { $divide: [1000, { $cond: [{ $eq: ['$pricePerHour', 0] }, 1, '$pricePerHour'] }] }
                ]
              },
              { $multiply: ['$distance', 0.002] }
            ]
          },
          recommendationScore: {
            $add: [
              {
                $subtract: [
                  {
                    $add: [
                      { $multiply: ['$rating', 20] },
                      { $divide: [1000, { $cond: [{ $eq: ['$pricePerHour', 0] }, 1, '$pricePerHour'] }] }
                    ]
                  },
                  { $multiply: ['$distance', 0.002] }
                ]
              },
              '$availabilityScore'
            ]
          }
        }
      },
      {
        $sort: sortConfig
      },
      {
        $limit: 20
      }
    );

    const workers = await Worker.aggregate(pipeline);

    if (workers.length === 0) {
      const fallbackFilter = filterConditions.length ? { $and: filterConditions } : {};
      const fallbackSort = {};

      if (sortBy === 'distance') {
        fallbackSort.rating = order;
      } else if (sortBy === 'rating') {
        fallbackSort.rating = order;
      } else if (sortBy === 'pricePerHour') {
        fallbackSort.pricePerHour = order;
      } else {
        fallbackSort.aiScore = order;
        fallbackSort.rating = -1;
        fallbackSort.pricePerHour = 1;
        fallbackSort.available = -1;
      }

      const fallbackWorkers = await Worker.find(fallbackFilter)
        .sort(fallbackSort)
        .limit(20);

      return sendSuccess(res, fallbackWorkers, 'No nearby workers found; returning broader results');
    }

    sendSuccess(res, workers, 'High-performance optimized workers list retrieved');
  } catch (err) {
    next(err);
  }
};

exports.seedWorker = async (req, res, next) => {
  try {
    const { name, skills, rating, pricePerHour, lat, lng } = req.body;
    
    const worker = new Worker({
      name,
      skills,
      rating,
      pricePerHour,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    });

    await worker.save();
    
    sendSuccess(res, worker, 'Worker Seeded directly via Admin action', 201);
  } catch (err) {
    next(err);
  }
};

exports.hireWorker = async (req, res, next) => {
  try {
    const { workerId, message } = req.body;
    const userId = req.user.id;

    // Check if worker exists
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Create hire request
    const hire = new Hire({
      user: userId,
      worker: workerId,
      message: message || ''
    });

    await hire.save();

    // Populate user and worker for notification
    await hire.populate('user', 'name email');
    await hire.populate('worker', 'name');

    // Emit socket event to notify worker (assuming worker has a socket room by ID)
    const io = req.app.get('io');
    if (io) {
      io.to(`worker_${workerId}`).emit('hireRequest', {
        hireId: hire._id,
        user: hire.user,
        message: hire.message,
        createdAt: hire.createdAt
      });
    }

    sendSuccess(res, hire, 'Hire request sent successfully');
  } catch (err) {
    next(err);
  }
};

exports.getWorkerHires = async (req, res, next) => {
  try {
    const workerProfile = await Worker.findOne({ user: req.user.id }).select('_id');
    if (!workerProfile) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    const hires = await Hire.find({ worker: workerProfile._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    sendSuccess(res, hires, 'Worker hire requests retrieved');
  } catch (err) {
    next(err);
  }
};

exports.rateWorker = async (req, res, next) => {
  try {
    const { hireId, rating, review } = req.body;
    const userId = req.user.id;

    // Find the hire and verify ownership
    const hire = await Hire.findById(hireId).populate('worker');
    if (!hire) {
      return res.status(404).json({ success: false, message: 'Hire request not found' });
    }

    if (hire.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to rate this hire' });
    }

    if (hire.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Can only rate accepted hires' });
    }

    // Update hire with rating
    hire.userRating = rating;
    hire.userReview = review || '';
    hire.ratedAt = new Date();
    hire.status = 'completed';
    await hire.save();

    // Recalculate worker's overall rating
    const allHires = await Hire.find({ 
      worker: hire.worker._id, 
      userRating: { $exists: true } 
    });

    if (allHires.length > 0) {
      const totalRating = allHires.reduce((sum, h) => sum + h.userRating, 0);
      const averageRating = totalRating / allHires.length;
      
      // Update worker's rating
      await Worker.findByIdAndUpdate(hire.worker._id, { 
        rating: Math.round(averageRating * 10) / 10 // Round to 1 decimal
      });
    }

    sendSuccess(res, hire, 'Worker rated successfully');
  } catch (err) {
    next(err);
  }
};

exports.getUserHires = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const hires = await Hire.find({ user: userId })
      .populate('worker', 'name skills rating pricePerHour')
      .sort({ createdAt: -1 });

    sendSuccess(res, hires, 'User hire history retrieved');
  } catch (err) {
    next(err);
  }
};

exports.updateWorkerAvailability = async (req, res, next) => {
  try {
    const { available, lat, lng } = req.body;
    const workerProfile = await Worker.findOne({ user: req.user.id }).select('_id');
    if (!workerProfile) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    const update = { available };
    
    if (lat && lng) {
      update.location = {
        type: 'Point',
        coordinates: [lng, lat]
      };
      update.lastLocationUpdate = new Date();
    }

    const worker = await Worker.findByIdAndUpdate(workerProfile._id, update, { new: true });
    
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Broadcast to all connected clients via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('worker-availability-changed', {
        workerId: worker._id,
        available: worker.available,
        location: worker.location
      });
    }

    sendSuccess(res, worker, 'Availability updated');
  } catch (err) {
    next(err);
  }
};
