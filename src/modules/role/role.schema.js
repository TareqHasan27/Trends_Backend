const { z } = require('zod');

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  permissionIds: z.array(z.string().uuid()).default([]),
  grantAll: z.boolean().default(false),
});

const updateRoleSchema = createRoleSchema.partial();

module.exports = { createRoleSchema, updateRoleSchema };
