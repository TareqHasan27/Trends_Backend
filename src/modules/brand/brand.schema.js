const { z } = require('zod');

const brandSchema = z.object({
  name: z.string().min(1).max(150),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  logoId: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  description: z.string().optional(),
});

module.exports = { brandSchema, updateBrandSchema: brandSchema.partial() };
