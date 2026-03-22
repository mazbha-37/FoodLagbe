const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security headers
app.use(helmet());

// CORS — support comma-separated origins for multi-environment
const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Logging
app.use(morgan('dev'));

// Stripe webhook — raw body BEFORE express.json (handled inside webhookRoutes)
app.use('/api/v1/webhooks', require('./routes/webhookRoutes'));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL injection
// Express 5 makes req.query read-only, so we sanitize body and params only
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  next();
});

// Prevent HTTP parameter pollution
app.use(hpp());

// ─── Swagger docs (development only) ─────────────────────────────────────────

if (process.env.NODE_ENV === 'development') {
  const swaggerJsdoc = require('swagger-jsdoc');
  const swaggerUi = require('swagger-ui-express');

  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Food Lagbe API',
        version: '1.0.0',
        description: 'REST API for Food Lagbe — a Bangladeshi food delivery platform.',
      },
      servers: [{ url: '/api/v1', description: 'Development server' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.js'],
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('Swagger docs available at /api-docs');
}

// ─── API routes ───────────────────────────────────────────────────────────────

app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/restaurants', require('./routes/restaurantRoutes'));
app.use('/api/v1/restaurants/:restaurantId/categories', require('./routes/categoryRoutes'));
app.use(
  '/api/v1/restaurants/:restaurantId/categories/:catId/items',
  require('./routes/menuItemRoutes')
);
app.use('/api/v1/cart', require('./routes/cartRoutes'));
app.use('/api/v1/orders', require('./routes/orderRoutes'));
app.use('/api/v1/coupons', require('./routes/couponRoutes'));
app.use('/api/v1/complaints', require('./routes/complaintRoutes'));
app.use('/api/v1/notifications', require('./routes/notificationRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/riders', require('./routes/riderRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));

// ─── Health check ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Server is healthy
 */
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
