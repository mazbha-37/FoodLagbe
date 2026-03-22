# Food Lagbe (ফুড লাগবে)

A full-stack food delivery platform built with the MERN stack. Customers can browse restaurants, place orders, and track deliveries in real time. Restaurant owners manage menus and orders. Riders handle pickups and deliveries with live GPS tracking. Admins oversee the entire platform.

## Screenshots

> _Screenshots coming soon._

## Features

### Customer
- Browse nearby restaurants with location-based search
- Search restaurants by name or cuisine type
- View restaurant menus with categories
- Add items to cart with special instructions
- Checkout with Stripe payment integration
- Real-time order tracking with live map
- Live chat with assigned rider
- Order history and reordering
- Rate and review restaurants
- File complaints on orders
- Apply coupon codes for discounts
- Profile management

### Restaurant Owner
- Apply to register a restaurant (admin-approved)
- Dashboard with order statistics and earnings charts
- Full menu management (categories, items, images, pricing)
- Real-time new order notifications with sound alert
- Accept/reject incoming orders
- Update order status (preparing → ready for pickup)
- Restaurant settings and profile management
- Earnings tracking (daily/weekly/monthly)

### Rider
- Apply as a delivery rider (admin-approved)
- Toggle availability on/off
- Auto-assignment of nearby orders (haversine distance)
- Active delivery view with route map
- Step-by-step status updates (picked up → on the way → delivered)
- Live GPS broadcasting to customer
- Chat with customer during delivery
- Delivery history and earnings dashboard

### Admin
- Dashboard with platform-wide analytics
- Approve/reject restaurant applications
- Approve/reject rider applications
- User management (view, suspend)
- Order oversight across all restaurants
- Complaint management and resolution
- Coupon creation and management

### Platform
- Real-time notifications via Socket.IO
- JWT authentication with refresh tokens
- Role-based access control (customer, restaurant_owner, rider, admin)
- Responsive design (mobile + desktop)
- Leaflet maps for location picking and delivery tracking
- Image uploads via Cloudinary
- Stripe payments with webhook verification
- API documentation via Swagger UI

## Tech Stack

### Frontend
| Technology | Version |
|---|---|
| React | 19.2 |
| Vite | 8.0 |
| Redux Toolkit (RTK Query) | 2.11 |
| React Router | 7.13 |
| Tailwind CSS | 4.2 |
| Socket.IO Client | 4.8 |
| Leaflet + React Leaflet | 1.9 / 5.0 |
| Recharts | 3.8 |
| React Hook Form + Zod | 7.71 / 4.3 |
| Lucide React | 0.577 |
| date-fns | 4.1 |

### Backend
| Technology | Version |
|---|---|
| Node.js | 20+ |
| Express | 5.2 |
| MongoDB + Mongoose | 7+ / 9.3 |
| Socket.IO | 4.8 |
| JSON Web Tokens | 9.0 |
| Stripe | 20.4 |
| Cloudinary | 2.9 |
| Joi (validation) | 18.0 |
| Swagger (jsdoc + UI) | 6.2 / 5.0 |
| Helmet / CORS / HPP | 8.1 / 2.8 / 0.2 |
| Winston (logging) | 3.19 |
| node-cron | 4.2 |

## Prerequisites

- **Node.js** >= 20
- **MongoDB** >= 7 (local or Atlas)
- **npm** >= 9
- **Stripe** account (for payments)
- **Cloudinary** account (for image uploads)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/FoodLagbe.git
cd FoodLagbe
```

### 2. Install all dependencies

```bash
npm run install:all
```

This installs dependencies for the root, `server/`, and `client/` directories.

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/foodlagbe` |
| `JWT_ACCESS_SECRET` | Secret key for access tokens | Any random secure string |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | Any random secure string (different from above) |
| `JWT_ACCESS_EXPIRY` | Access token lifespan | `1h` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifespan | `30d` |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary API key | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | From Cloudinary dashboard |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `CLIENT_URL` | Frontend URL (for CORS) | `http://localhost:5173` |
| `ADMIN_EMAIL` | Default admin email (for seeding) | `admin@foodlagbe.com` |
| `ADMIN_PASSWORD` | Default admin password (for seeding) | `Admin@1234` |

Also create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Start MongoDB

```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas (update MONGODB_URI in .env)
```

### 5. Seed the database

```bash
cd server
npm run seed:admin    # Creates the default admin user
npm run seed:data     # Populates sample restaurants, menus, etc.
cd ..
```

### 6. Run the application

```bash
npm run dev
```

This starts both the server (port 5000) and client (port 5173) concurrently.

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api/v1
- **API Docs:** http://localhost:5000/api-docs (development only)
- **Health Check:** http://localhost:5000/api/v1/health

## API Documentation

Interactive API docs are available at `/api-docs` when running in development mode. Built with Swagger UI.

### API Routes Overview

| Prefix | Description |
|---|---|
| `/api/v1/auth` | Register, login, logout, refresh token, forgot/reset password |
| `/api/v1/users` | User profile management |
| `/api/v1/restaurants` | Browse restaurants, restaurant CRUD |
| `/api/v1/restaurants/:id/categories` | Menu category management |
| `/api/v1/restaurants/:id/categories/:catId/items` | Menu item management |
| `/api/v1/cart` | Cart operations (add, update, remove, clear) |
| `/api/v1/orders` | Place orders, update status, track, messages |
| `/api/v1/riders` | Rider profile, availability, active delivery, earnings |
| `/api/v1/coupons` | Coupon validation and management |
| `/api/v1/complaints` | File and manage complaints |
| `/api/v1/notifications` | User notifications |
| `/api/v1/admin` | Admin dashboard, approvals, user management |
| `/api/v1/webhooks` | Stripe webhook handler |

## Folder Structure

```
FoodLagbe/
├── client/                     # React frontend
│   ├── public/                 # Static assets (favicon, icons)
│   ├── src/
│   │   ├── app/                # Redux store & API slice
│   │   ├── assets/             # Images
│   │   ├── components/
│   │   │   ├── layout/         # Navbar, Footer, DashboardLayout
│   │   │   ├── map/            # Leaflet map components
│   │   │   └── ui/             # Reusable UI (Button, Modal, Badge, etc.)
│   │   ├── features/
│   │   │   ├── admin/          # Admin dashboard & management pages
│   │   │   ├── auth/           # Login, Register, auth slice
│   │   │   ├── chat/           # ChatPanel component
│   │   │   ├── customer/       # Home, restaurants, cart, checkout, tracking
│   │   │   ├── notifications/  # NotificationBell & API
│   │   │   ├── restaurant/     # Restaurant dashboard, menu, orders
│   │   │   └── rider/          # Rider dashboard, delivery, earnings
│   │   ├── hooks/              # useSocket
│   │   ├── routes/             # AppRoutes, ProtectedRoute, RoleRoute
│   │   ├── socket/             # Socket.IO client
│   │   └── utils/              # formatCurrency, formatDate, distance
│   ├── index.html
│   └── vite.config.js
│
├── server/                     # Express backend
│   ├── seed/                   # Database seed scripts
│   ├── src/
│   │   ├── config/             # DB, Cloudinary, Stripe, Socket config
│   │   ├── controllers/        # Route handlers (15 controllers)
│   │   ├── jobs/               # Cron jobs (order timeout)
│   │   ├── middleware/         # Auth, authorize, error, rate limit, upload
│   │   ├── models/             # Mongoose schemas (13 models)
│   │   ├── routes/             # Express routes (13 route files)
│   │   ├── services/           # Business logic (rider assignment, fees, etc.)
│   │   ├── socket/             # Socket.IO auth & handlers
│   │   ├── utils/              # AppError, catchAsync, haversine
│   │   ├── validators/         # Joi request validators
│   │   └── app.js              # Express app setup
│   ├── server.js               # Entry point (HTTP + Socket.IO)
│   └── .env.example
│
└── package.json                # Root scripts (dev, install:all)
```

## Deployment

### Frontend
Build the production bundle:
```bash
cd client && npm run build
```
Deploy the `client/dist/` folder to any static host (Vercel, Netlify, etc.). Set the `VITE_API_URL` and `VITE_SOCKET_URL` environment variables to point to your production server.

### Backend
- Set `NODE_ENV=production` and configure all environment variables
- Use a process manager like PM2: `pm2 start server/server.js`
- Set up a reverse proxy (Nginx) with SSL
- Configure Stripe webhook endpoint to point to `https://yourdomain.com/api/v1/webhooks/stripe`
- Use MongoDB Atlas for production database

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

Please follow the existing code style and include meaningful commit messages.

## License

This project is licensed under the [MIT License](LICENSE).
