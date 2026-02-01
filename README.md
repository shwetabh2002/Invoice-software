# Invoices

A modern, full-stack invoicing application built with Next.js, Express.js, and MongoDB.

## 🚀 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS, shadcn/ui |
| Backend | Express.js, Node.js 20 |
| Database | MongoDB 7 with Mongoose |
| Auth | JWT + HTTP-only cookies |
| State | Zustand, TanStack Query |

## 📁 Project Structure

```
girjasoft-invoices/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── config/         # Database config
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, error handling
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API routes
│   │   ├── scripts/        # Seed scripts
│   │   └── app.js
│   └── package.json
│
├── frontend/               # Next.js App
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # API client, utils
│   │   └── stores/        # Zustand stores
│   └── package.json
│
└── docker-compose.yml
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 7+ (or use Docker)
- npm or yarn

### Option 1: Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Include dev tools (Mongo Express)
docker-compose --profile dev up -d
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Mongo Express: http://localhost:8081 (with dev profile)

### Option 2: Manual Setup

#### Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env with your MongoDB connection string
# MONGODB_URI=mongodb://localhost:27017/girjasoft-invoices

# Seed the database (creates admin user and default data)
npm run seed

# Start development server
npm run dev
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔑 Default Credentials

After seeding the database:

- **Email:** admin@example.com
- **Password:** admin123

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user
- `POST /api/auth/refresh` - Refresh token

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/clients/:id` - Get client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice
- `PUT /api/invoices/:id` - Update invoice
- `POST /api/invoices/:id/send` - Mark as sent
- `POST /api/invoices/:id/copy` - Copy invoice

### Quotations
- `GET /api/quotes` - List quotations
- `POST /api/quotes` - Create quotation
- `POST /api/quotes/:id/convert` - Convert to invoice

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings/:key` - Update setting

## 🎨 Features

- ✅ User authentication with JWT
- ✅ Client management
- ✅ Invoice creation and management
- ✅ Quotation creation with invoice conversion
- ✅ Payment tracking
- ✅ Dashboard with statistics
- ✅ Product catalog
- ✅ Tax rates management
- ✅ Number series (invoice/quotation numbering)
- ✅ Payment methods
- ✅ PDF generation
- ✅ Email sending
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Comprehensive loading states
- 🚧 Reports
- 🚧 Data migration from MySQL

## 📝 Environment Variables

### Backend (.env)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/girjasoft-invoices
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Girjasoft Invoices** - Professional invoicing and quotation management.
