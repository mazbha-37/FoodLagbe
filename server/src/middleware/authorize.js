const AppError = require('../utils/AppError');

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN')
    );
  }
  next();
};

module.exports = authorize;
