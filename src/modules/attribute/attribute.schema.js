const { z } = require('zod');

const attributeSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/),
  type: z.enum(['dropdown', 'radio', 'checkbox', 'colour_swatch', 'image_swatch']),
});

const attributeValueSchema = z.object({
  value: z.string().min(1).max(150),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  referenceValue: z.string().optional().nullable(),
  referenceMediaId: z.string().uuid().optional().nullable(),
});

module.exports = {
  attributeSchema,
  updateAttributeSchema: attributeSchema.partial(),
  attributeValueSchema,
  updateAttributeValueSchema: attributeValueSchema.partial(),
};
