const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const workerController = require('../controllers/workerController');

// Get all workers - Protected stringently allowing only logged in users.
router.get('/', protect, workerController.getWorkers);

// Hire a worker - Protected for logged in users.
router.post('/hire', protect, workerController.hireWorker);

// Get worker's hire requests - Protected for workers only.
router.get('/hires', protect, authorize('worker'), workerController.getWorkerHires);

// Rate a completed hire - Protected for logged in users.
router.post('/rate', protect, workerController.rateWorker);

// Get user's hire history - Protected for logged in users.
router.get('/user-hires', protect, workerController.getUserHires);

// Update worker availability and location - Protected for workers.
router.put('/availability', protect, authorize('worker'), workerController.updateWorkerAvailability);

// Create a mock worker for testing - Only strictly allowed for Admins.
router.post('/seed', protect, authorize('admin'), workerController.seedWorker);

module.exports = router;
