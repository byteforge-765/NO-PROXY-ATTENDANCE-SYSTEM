const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET || 'icms_secret');
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorise = (roles = []) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ success: false, message: 'Access denied' });
  next();
};

module.exports = { authenticate, authorise };
