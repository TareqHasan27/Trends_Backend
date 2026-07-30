const { z } = require('zod');

const emptyToUndefined = (value) => (value === '' || value === undefined ? undefined : value);
const emptyToNull = (value) => (value === '' || value === undefined ? null : value);

const booleanField = () =>
  z.preprocess((value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === '' || value === undefined) return undefined;
    return value;
  }, z.coerce.boolean().optional());

const variantSchema = z.object({
  sku: z.string().min(1),
  price: z.preprocess(emptyToUndefined, z.coerce.number().positive()),
  salePrice: z.preprocess(emptyToNull, z.coerce.number().positive().nullable().optional()),
  stock: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(0)),
  lowStockThreshold: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(5)),
  weight: z.preprocess(emptyToNull, z.coerce.number().positive().nullable().optional()),
  isActive: z.preprocess((value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }, z.coerce.boolean().default(true)),
  attributeValueIds: z.array(z.string().uuid()).min(1),
});

const mediaAttachSchema = z.object({
  mediaId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  attributeValueId: z.string().uuid().optional().nullable(),
  isThumbnail: z.preprocess((value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }, z.coerce.boolean().default(false)),
  isGallery: z.preprocess((value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }, z.coerce.boolean().default(false)),
  sortOrder: z.preprocess(emptyToUndefined, z.coerce.number().int().default(0)),
});

const baseProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(300).regex(/^[a-z0-9-]+$/),
  sku: z.string().optional().nullable(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  hasVariants: booleanField().default(false),
  price: z.preprocess(emptyToNull, z.coerce.number().positive().nullable().optional()),
  salePrice: z.preprocess(emptyToNull, z.coerce.number().positive().nullable().optional()),
  stock: z.preprocess(emptyToNull, z.coerce.number().int().min(0).nullable().optional()),
  weight: z.preprocess(emptyToNull, z.coerce.number().positive().nullable().optional()),
  isActive: booleanField().default(true),
  isFeatured: booleanField().default(false),
  sortOrder: z.preprocess(emptyToUndefined, z.coerce.number().int().default(0)),
  brandId: z.string().uuid().optional().nullable(),
  categoryIds: z.array(z.string().uuid()).default([]),
  variants: z.array(variantSchema).default([]),
  media: z.array(mediaAttachSchema).default([]),
});

// Validate product business rules in service layer instead of schema
const createProductSchema = baseProductSchema;
const updateProductSchema = baseProductSchema.partial();

module.exports = { createProductSchema, updateProductSchema };
