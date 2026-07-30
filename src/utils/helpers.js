const { z } = require('zod');

const respond = (res, status, data) => res.status(status).json(data);

const success = (res, data, status = 200) =>
  respond(res, status, { success: true, data });

const paginated = (res, data, meta) =>
  respond(res, 200, { success: true, data, meta });

const error = (res, status, message, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return respond(res, status, body);
};

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues ?? result.error.errors ?? [];
    const errors = issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return error(res, 422, 'Validation failed', errors);
  }
  req.body = result.data;
  next();
};

const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const issues = result.error.issues ?? result.error.errors ?? [];
    const errors = issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return error(res, 422, 'Validation failed', errors);
  }
  req.query = result.data;
  next();
};

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const getPagination = (page, limit) => ({
  offset: (page - 1) * limit,
  limit,
});

module.exports = { success, paginated, error, asyncHandler, validate, validateQuery, paginationSchema, getPagination };
