const { verifyToken } = require('../config/jwt');

const { User, UserType } = require('../models');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = verifyToken(token);

    const user = await User.findOne({
      where: { user_id: decoded.id },
      attributes: ['user_id', 'username', 'email'],
    });

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findOne({
        where: { user_id: req.user.user_id },
        include: {
          model: UserType,
          as: 'UserType',
          attributes: ['role']
        }
      });

      const userRole = user.UserType.role;

      if (!roles.includes(userRole)) {
        return res.status(403).json({ message: `User role '${userRole}' not authorized` });
      }

      next();
    } catch (err) {
      console.error('Authorization error:', err);
      res.status(500).json({ message: 'Server error during authorization' });
    }
  };
};

module.exports = { protect, authorize };
