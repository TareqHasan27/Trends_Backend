const { z } = require('zod');

const createUserSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  roleId: z.string().uuid(),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  phone: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  roleId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

module.exports = { createUserSchema, updateUserSchema };
