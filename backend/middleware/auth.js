const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route, no token provided' });
    }

    // Verify token structure and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach validated user to the request
    req.user = await User.findById(decoded.user.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User belonging to this token no longer exists' });
    }

    next();
  } catch (err) {
    next(err); // passes invalid/expired Token errors to the global error middleware
  }
};

// Role authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Role defined as '${req.user.role}' is not authorized to access this action` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
