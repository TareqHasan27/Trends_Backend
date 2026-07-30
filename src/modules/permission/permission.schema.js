const { z } = require('zod');

const STANDARD_ACTIONS = ['watch', 'create', 'read', 'update', 'delete', 'upload', 'write', 'approve', 'status'];

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  actions: z.array(z.string().min(1)).min(1),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  actions: z.array(z.string().min(1)).optional(),
});

module.exports = { createGroupSchema, updateGroupSchema, STANDARD_ACTIONS };
