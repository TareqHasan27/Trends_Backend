const { error } = require('../utils/helpers');

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.code === '23505') {
    const match = err.detail?.match(/Key \((.+?)\)=\((.+?)\)/);
    const field = match ? match[1] : 'field';
    return error(res, 409, `Duplicate value for ${field}`);
  }
  if (err.code === '23503') return error(res, 409, 'Referenced record does not exist');
  if (err.code === '23514') return error(res, 422, 'Value violates check constraint');

  return error(res, 500, 'Internal server error');
};

module.exports = errorHandler;
