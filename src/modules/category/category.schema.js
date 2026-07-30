const { z } = require('zod');

const categorySchema = z.object({
  name: z.string().min(1).max(150),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  imageId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

module.exports = { categorySchema, updateCategorySchema: categorySchema.partial() };
