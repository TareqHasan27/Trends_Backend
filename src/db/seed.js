require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const ALL_PERMISSIONS = [
  { group: 'Dashboard', actions: ['watch'] },
  { group: 'Permission', actions: ['watch', 'create', 'read', 'update', 'delete'] },
  { group: 'Role', actions: ['watch', 'create', 'read', 'update', 'delete'] },
  { group: 'User', actions: ['watch', 'create', 'read', 'update', 'delete'] },
  { group: 'Media', actions: ['watch', 'read', 'upload', 'write', 'delete'] },
  { group: 'Category', actions: ['watch', 'create', 'read', 'update', 'delete'] },
  { group: 'Brand', actions: ['watch', 'create', 'read', 'update', 'delete'] },
  { group: 'Attribute', actions: ['watch', 'create', 'read', 'update', 'delete'] },
  { group: 'Product', actions: ['watch', 'create', 'read', 'update', 'delete'] },
];

async function seed() {
  await client.connect();
  console.log('Seeding...');

  // Insert permission groups and permissions
  const permissionIds = [];
  for (const { group, actions } of ALL_PERMISSIONS) {
    const groupRes = await client.query(
      `INSERT INTO permission_groups (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [group]
    );
    const groupId = groupRes.rows[0].id;

    for (const action of actions) {
      const permName = `${group.toLowerCase()}:${action}`;
      const permRes = await client.query(
        `INSERT INTO permissions (name, group_id) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [permName, groupId]
      );
      permissionIds.push(permRes.rows[0].id);
    }
  }

  // Super admin role with all permissions
  const superRoleRes = await client.query(
    `INSERT INTO roles (name, description, status) VALUES ('Super Admin', 'Full access', 'active')
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`
  );
  const superRoleId = superRoleRes.rows[0].id;

  for (const pid of permissionIds) {
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [superRoleId, pid]
    );
  }

  // Catalog-only role
  const catalogPerms = ['category:watch','category:create','category:read','category:update','category:delete',
    'brand:watch','brand:create','brand:read','brand:update','brand:delete',
    'attribute:watch','attribute:create','attribute:read','attribute:update','attribute:delete',
    'product:watch','product:create','product:read','product:update','product:delete',
    'media:watch','media:read','media:upload','media:write','media:delete',
    'dashboard:watch'];

  const catalogRoleRes = await client.query(
    `INSERT INTO roles (name, description, status) VALUES ('Catalog Manager', 'Catalog access only', 'active')
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`
  );
  const catalogRoleId = catalogRoleRes.rows[0].id;

  for (const pname of catalogPerms) {
    const pRes = await client.query(`SELECT id FROM permissions WHERE name = $1`, [pname]);
    if (pRes.rows[0]) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [catalogRoleId, pRes.rows[0].id]
      );
    }
  }

  // Super admin user
  const superHash = await bcrypt.hash('Admin@1234', 12);
  await client.query(
    `INSERT INTO users (name, email, password, role_id, is_active)
     VALUES ('Super Admin', 'admin@trendecom.com', $1, $2, true)
     ON CONFLICT (email) DO NOTHING`,
    [superHash, superRoleId]
  );

  // Catalog user
  const catalogHash = await bcrypt.hash('Catalog@1234', 12);
  await client.query(
    `INSERT INTO users (name, email, password, role_id, is_active)
     VALUES ('Catalog User', 'catalog@trendecom.com', $1, $2, true)
     ON CONFLICT (email) DO NOTHING`,
    [catalogHash, catalogRoleId]
  );

  console.log('Seed completed.');
  console.log('Super Admin  -> admin@trendecom.com / Admin@1234');
  console.log('Catalog User -> catalog@trendecom.com / Catalog@1234');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
