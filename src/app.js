require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const permissionRoutes = require('./modules/permission/permission.routes');
const roleRoutes = require('./modules/role/role.routes');
const userRoutes = require('./modules/user/user.routes');
const mediaRoutes = require('./modules/media/media.routes');
const categoryRoutes = require('./modules/category/category.routes');
const brandRoutes = require('./modules/brand/brand.routes');
const attributeRoutes = require('./modules/attribute/attribute.routes');
const productRoutes = require('./modules/product/product.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/products', productRoutes);

// Custom error handler — must handle thrown {status, message} objects
app.use((err, req, res, next) => {
  if (err.status && err.message) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  errorHandler(err, req, res, next);
});

module.exports = app;
