# Trends Bird Limited — Ecommerce Admin Backend

Node.js REST API for the Ecommerce Admin Dashboard assignment.

---

## Tech Stack

| Area | Choice |
|------|--------|
| Runtime | Node.js v22 (LTS) |
| Framework | Express.js |
| Database | PostgreSQL (plain `pg`) |
| Auth | JWT — Access Token (15m) + Refresh Token (7d) |
| Validation | Zod |
| Password | bcrypt |
| File Upload | Multer + Sharp (thumbnail generation) |

---

## Setup & Run

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` with your DB credentials (defaults already set for `trend_ecom`).

### 3. Create database (first time only)
```bash
psql -U postgres -c "CREATE DATABASE trend_ecom;"
psql -U postgres -c "CREATE USER trend_ecom WITH PASSWORD 'trend_ecom';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE trend_ecom TO trend_ecom;"
```

### 4. Run migrations (creates all tables)
```bash
npm run migrate
```

### 5. Seed database (permissions, roles, users)
```bash
npm run seed
```

### 6. Start server
```bash
npm run dev      # development (nodemon)
npm start        # production
```

Server runs on `http://localhost:3000`

---

## Seeded Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@trendecom.com | Admin@1234 |
| Catalog Manager | catalog@trendecom.com | Catalog@1234 |

---

## Token Strategy

**Authorization: Bearer header**

- Login returns `accessToken` (15 min) and `refreshToken` (7 days)
- Send `Authorization: Bearer <accessToken>` on every protected request
- Use `POST /api/auth/refresh` with `{ refreshToken }` to get a new access token (refresh token rotates on every use)
- Logout revokes the refresh token server-side — the old token stops working immediately

---

## API Routes

### Auth (public)
```
POST   /api/auth/login       — email + password → tokens
POST   /api/auth/refresh     — { refreshToken } → new tokens
POST   /api/auth/logout      — revoke refresh token (auth required)
GET    /api/auth/session      — current user + role + permissions
```

### Permissions
```
GET    /api/permissions
POST   /api/permissions
GET    /api/permissions/:id
PUT    /api/permissions/:id
DELETE /api/permissions/:id
```

### Roles
```
GET    /api/roles
POST   /api/roles
GET    /api/roles/:id
PUT    /api/roles/:id
DELETE /api/roles/:id
```

### Users
```
GET    /api/users
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
```

### Media
```
POST   /api/media/upload     — multipart/form-data, field: files (max 10)
GET    /api/media
GET    /api/media/:id
PUT    /api/media/:id        — update alt text / title
DELETE /api/media/:id
```

### Categories
```
GET    /api/categories/tree  — full nested tree
GET    /api/categories/:id
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

### Brands
```
GET    /api/brands
POST   /api/brands
GET    /api/brands/:id
PUT    /api/brands/:id
DELETE /api/brands/:id
```

### Attributes
```
GET    /api/attributes
POST   /api/attributes
GET    /api/attributes/:id
PUT    /api/attributes/:id
DELETE /api/attributes/:id

POST   /api/attributes/:id/values
PUT    /api/attributes/:id/values/:valueId
DELETE /api/attributes/:id/values/:valueId
```

### Products
```
GET    /api/products
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id
```

---

## Module Status

| # | Module | Status |
|---|--------|--------|
| 1 | Authentication | ✅ Complete |
| 2 | Permission | ✅ Complete |
| 3 | Role | ✅ Complete |
| 4 | User | ✅ Complete |
| 5 | Media | ✅ Complete |
| 6 | Category | ✅ Complete |
| 7 | Brand | ✅ Complete |
| 8 | Attribute | ✅ Complete |
| 9 | Product | ✅ Complete |

---

## Project Structure

```
src/
├── app.js                        ← Express app, all routes mounted
├── server.js                     ← HTTP server
├── db/
│   ├── pool.js                   ← PostgreSQL connection pool
│   ├── migrate.js                ← Creates all tables
│   └── seed.js                   ← Seeds permissions, roles, users
├── middlewares/
│   ├── auth.js                   ← authGuard + requirePermission
│   └── errorHandler.js           ← Central error handler
├── utils/
│   └── helpers.js                ← success/error response, validate, pagination
└── modules/
    ├── auth/
    ├── permission/
    ├── role/
    ├── user/
    ├── media/
    ├── category/
    ├── brand/
    ├── attribute/
    └── product/
```

Each module contains: `*.routes.js` → `*.controller.js` → `*.service.js` → `*.schema.js`

---

## Design Decisions

- **Role change takes effect on next request** — the auth guard fetches the user's role fresh from DB on every request, so a role change is immediate without needing a token refresh.
- **User delete is hard delete.**
- **Category delete** is refused if children or products exist — no silent orphaning.
- **Brand delete** is refused if products reference it.
- **Attribute/value delete** is refused if used by any product variant.
- **Media delete** is refused if attached to any product — detach first.
- **Permissions cascade** from role when a permission group is deleted.
- **Product creation is atomic** — if variants fail, no partial product is saved (transaction).

---

## Environment Variables

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trend_ecom
DB_USER=trend_ecom
DB_PASSWORD=trend_ecom
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```
