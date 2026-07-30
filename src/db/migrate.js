require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  await client.connect();
  console.log('Running migrations...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS permission_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
      avatar TEXT,
      role_id UUID NOT NULL REFERENCES roles(id),
      is_active BOOLEAN NOT NULL DEFAULT true,
      refresh_token TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS media (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      file_name VARCHAR(255) NOT NULL,
      stored_path TEXT NOT NULL,
      public_url TEXT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'video', 'document', 'other')),
      size INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      thumbnail_url TEXT,
      alt_text TEXT,
      title TEXT,
      uploaded_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(150) NOT NULL,
      slug VARCHAR(200) NOT NULL UNIQUE,
      description TEXT,
      image_id UUID REFERENCES media(id) ON DELETE SET NULL,
      parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS brands (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(150) NOT NULL UNIQUE,
      slug VARCHAR(200) NOT NULL UNIQUE,
      logo_id UUID REFERENCES media(id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS attributes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      slug VARCHAR(150) NOT NULL UNIQUE,
      type VARCHAR(30) NOT NULL CHECK (type IN ('dropdown', 'radio', 'checkbox', 'colour_swatch', 'image_swatch')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS attribute_values (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE RESTRICT,
      value VARCHAR(150) NOT NULL,
      slug VARCHAR(200) NOT NULL,
      reference_value TEXT,
      reference_media_id UUID REFERENCES media(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (attribute_id, slug)
    );

    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(300) NOT NULL UNIQUE,
      sku VARCHAR(100) UNIQUE,
      short_description TEXT,
      long_description TEXT,
      has_variants BOOLEAN NOT NULL DEFAULT false,
      price NUMERIC(12,2),
      sale_price NUMERIC(12,2),
      stock INTEGER,
      stock_status VARCHAR(20) DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'low_stock')),
      weight NUMERIC(8,2),
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_featured BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS product_categories (
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sku VARCHAR(100) NOT NULL UNIQUE,
      price NUMERIC(12,2) NOT NULL,
      sale_price NUMERIC(12,2),
      stock INTEGER NOT NULL DEFAULT 0,
      stock_status VARCHAR(20) DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'low_stock')),
      low_stock_threshold INTEGER DEFAULT 5,
      weight NUMERIC(8,2),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS variant_attribute_values (
      variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
      attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE RESTRICT,
      PRIMARY KEY (variant_id, attribute_value_id)
    );

    CREATE TABLE IF NOT EXISTS product_media (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      media_id UUID NOT NULL REFERENCES media(id) ON DELETE RESTRICT,
      variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
      attribute_value_id UUID REFERENCES attribute_values(id) ON DELETE SET NULL,
      is_thumbnail BOOLEAN NOT NULL DEFAULT false,
      is_gallery BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Unique constraint: only one thumbnail per product
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS unique_product_thumbnail
      ON product_media (product_id)
      WHERE is_thumbnail = true AND variant_id IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS unique_variant_thumbnail
      ON product_media (variant_id)
      WHERE is_thumbnail = true AND variant_id IS NOT NULL;
  `);

  console.log('Migrations completed successfully.');
  await client.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
