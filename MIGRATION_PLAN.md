# InvoicePlane Migration: PHP → Next.js + Express.js + MongoDB

## 🎯 Project Overview

Migrating InvoicePlane from PHP/CodeIgniter/MySQL to a modern JavaScript stack.

### Technology Stack

| Layer | Old Stack | New Stack |
|-------|-----------|-----------|
| Frontend | PHP Views + Bootstrap 3 | Next.js 14 + Tailwind CSS + shadcn/ui |
| Backend | CodeIgniter 3 (PHP) | Express.js (Node.js) |
| Database | MySQL/MariaDB | MongoDB + Mongoose |
| Auth | Session-based | JWT + HTTP-only cookies |
| PDF | mPDF | PDFKit / Puppeteer |
| Email | PHPMailer | Nodemailer |

---

## 📁 Project Structure

```
invoiceplane-next/
├── backend/                    # Express.js API
│   ├── src/
│   │   ├── config/            # Database, env config
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic (PDF, email, etc.)
│   │   ├── utils/             # Helper functions
│   │   └── app.js             # Express app setup
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # Next.js App
│   ├── src/
│   │   ├── app/               # App router pages
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities, API client
│   │   ├── stores/            # Zustand state management
│   │   └── types/             # TypeScript types
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
│
├── scripts/                    # Migration scripts
│   └── migrate-mysql-to-mongo.js
│
└── docker-compose.yml
```

---

## 🗄️ Database Schema Mapping (MySQL → MongoDB)

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (bcrypt hashed),
  userType: Number (1=admin, 0=user),
  isActive: Boolean,
  profile: {
    name: String,
    company: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    country: String,
    phone: String,
    mobile: String,
    fax: String,
    web: String,
    vatId: String,
    taxCode: String
  },
  bankDetails: {
    bank: String,
    iban: String,
    bic: String
  },
  settings: {
    language: String,
    allClients: Boolean
  },
  passwordResetToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Clients Collection
```javascript
{
  _id: ObjectId,
  name: String (required),
  surname: String,
  title: String (mr/mrs/ms/dr),
  company: String,
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  contact: {
    email: String,
    phone: String,
    mobile: String,
    fax: String,
    web: String
  },
  tax: {
    vatId: String,
    taxCode: String
  },
  invoicingContact: String,
  language: String,
  isActive: Boolean,
  eInvoicing: {
    active: Boolean,
    version: String
  },
  customFields: Map,
  notes: [{
    date: Date,
    content: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Invoices Collection
```javascript
{
  _id: ObjectId,
  invoiceNumber: String (unique),
  urlKey: String (unique, 32 chars),
  client: ObjectId (ref: 'Client'),
  user: ObjectId (ref: 'User'),
  invoiceGroup: ObjectId (ref: 'InvoiceGroup'),
  status: String (enum: draft/sent/viewed/paid),
  isReadOnly: Boolean,
  password: String,
  dates: {
    created: Date,
    due: Date,
    modified: Date
  },
  items: [{
    name: String,
    description: String,
    quantity: Number,
    price: Number,
    discountAmount: Number,
    taxRate: ObjectId (ref: 'TaxRate'),
    product: ObjectId (ref: 'Product'),
    unit: String,
    order: Number,
    isRecurring: Boolean,
    amounts: {
      subtotal: Number,
      tax: Number,
      discount: Number,
      total: Number
    }
  }],
  amounts: {
    subtotal: Number,
    itemTaxTotal: Number,
    taxTotal: Number,
    discountAmount: Number,
    discountPercent: Number,
    total: Number,
    paid: Number,
    balance: Number
  },
  taxRates: [{
    taxRate: ObjectId (ref: 'TaxRate'),
    includeItemTax: Boolean,
    amount: Number
  }],
  terms: String,
  paymentMethod: ObjectId (ref: 'PaymentMethod'),
  sign: Number (1 or -1 for credit),
  creditInvoiceParent: ObjectId (ref: 'Invoice'),
  customFields: Map,
  recurring: {
    startDate: Date,
    endDate: Date,
    frequency: String,
    nextDate: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Quotes Collection
```javascript
{
  _id: ObjectId,
  quoteNumber: String (unique),
  urlKey: String (unique),
  client: ObjectId (ref: 'Client'),
  user: ObjectId (ref: 'User'),
  invoiceGroup: ObjectId (ref: 'InvoiceGroup'),
  invoice: ObjectId (ref: 'Invoice'), // When converted
  status: String (enum: draft/sent/viewed/approved/rejected/cancelled),
  password: String,
  dates: {
    created: Date,
    expires: Date,
    modified: Date
  },
  items: [{
    name: String,
    description: String,
    quantity: Number,
    price: Number,
    discountAmount: Number,
    taxRate: ObjectId,
    product: ObjectId,
    unit: String,
    order: Number,
    amounts: {
      subtotal: Number,
      tax: Number,
      discount: Number,
      total: Number
    }
  }],
  amounts: {
    subtotal: Number,
    itemTaxTotal: Number,
    taxTotal: Number,
    discountAmount: Number,
    discountPercent: Number,
    total: Number
  },
  taxRates: [{
    taxRate: ObjectId,
    includeItemTax: Boolean,
    amount: Number
  }],
  notes: String,
  customFields: Map,
  createdAt: Date,
  updatedAt: Date
}
```

### Payments Collection
```javascript
{
  _id: ObjectId,
  invoice: ObjectId (ref: 'Invoice', required),
  paymentMethod: ObjectId (ref: 'PaymentMethod'),
  amount: Number (required),
  date: Date (required),
  note: String,
  customFields: Map,
  createdAt: Date,
  updatedAt: Date
}
```

### Supporting Collections
- **InvoiceGroups**: Invoice numbering schemes
- **TaxRates**: Tax rate definitions
- **PaymentMethods**: Payment method options
- **Products**: Product catalog
- **Families**: Product families
- **Units**: Product units
- **Projects**: Project tracking
- **Tasks**: Task management
- **Settings**: App configuration (key-value)
- **EmailTemplates**: Email templates

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/login          - Login
POST   /api/auth/logout         - Logout
POST   /api/auth/refresh        - Refresh token
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me             - Current user
```

### Users
```
GET    /api/users               - List users (admin)
POST   /api/users               - Create user (admin)
GET    /api/users/:id           - Get user
PUT    /api/users/:id           - Update user
DELETE /api/users/:id           - Delete user (admin)
```

### Clients
```
GET    /api/clients             - List clients (paginated)
POST   /api/clients             - Create client
GET    /api/clients/:id         - Get client
PUT    /api/clients/:id         - Update client
DELETE /api/clients/:id         - Delete client
GET    /api/clients/:id/invoices
GET    /api/clients/:id/quotes
POST   /api/clients/:id/notes   - Add note
```

### Invoices
```
GET    /api/invoices            - List invoices (paginated, filtered)
POST   /api/invoices            - Create invoice
GET    /api/invoices/:id        - Get invoice
PUT    /api/invoices/:id        - Update invoice
DELETE /api/invoices/:id        - Delete invoice
POST   /api/invoices/:id/items  - Add item
PUT    /api/invoices/:id/items/:itemId
DELETE /api/invoices/:id/items/:itemId
POST   /api/invoices/:id/send   - Mark sent / send email
POST   /api/invoices/:id/copy   - Copy invoice
POST   /api/invoices/:id/credit - Create credit invoice
GET    /api/invoices/:id/pdf    - Generate PDF
```

### Quotes
```
GET    /api/quotes              - List quotes
POST   /api/quotes              - Create quote
GET    /api/quotes/:id          - Get quote
PUT    /api/quotes/:id          - Update quote
DELETE /api/quotes/:id          - Delete quote
POST   /api/quotes/:id/convert  - Convert to invoice
GET    /api/quotes/:id/pdf      - Generate PDF
```

### Payments
```
GET    /api/payments            - List payments
POST   /api/payments            - Record payment
GET    /api/payments/:id        - Get payment
PUT    /api/payments/:id        - Update payment
DELETE /api/payments/:id        - Delete payment
```

### Other Endpoints
```
/api/products, /api/tax-rates, /api/payment-methods,
/api/invoice-groups, /api/settings, /api/reports,
/api/email-templates, /api/dashboard
```

### Guest (Public) Endpoints
```
GET    /api/guest/invoice/:urlKey  - View invoice
GET    /api/guest/quote/:urlKey    - View quote
POST   /api/guest/quote/:urlKey/approve
POST   /api/guest/quote/:urlKey/reject
POST   /api/guest/invoice/:urlKey/pay  - Online payment
```

---

## 🎨 Frontend Pages (Next.js App Router)

```
/                           → Dashboard
/login                      → Login page
/clients                    → Client list
/clients/new                → Create client
/clients/[id]               → View client
/clients/[id]/edit          → Edit client
/invoices                   → Invoice list
/invoices/new               → Create invoice
/invoices/[id]              → View invoice
/invoices/[id]/edit         → Edit invoice
/quotes                     → Quote list
/quotes/new                 → Create quote
/quotes/[id]                → View quote
/quotes/[id]/edit           → Edit quote
/payments                   → Payment list
/payments/new               → Record payment
/products                   → Product list
/reports                    → Reports dashboard
/settings                   → App settings
/settings/invoice-groups
/settings/tax-rates
/settings/payment-methods
/settings/email-templates
/users                      → User management
/guest/invoice/[urlKey]     → Public invoice view
/guest/quote/[urlKey]       → Public quote view
```

---

## 📋 Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] Project structure setup
- [ ] Express.js server with MongoDB connection
- [ ] Mongoose models (all collections)
- [ ] Authentication middleware (JWT)
- [ ] Basic API structure

### Phase 2: Core Backend (Week 2)
- [ ] User CRUD + auth endpoints
- [ ] Client CRUD endpoints
- [ ] Invoice CRUD + calculations
- [ ] Quote CRUD + conversion
- [ ] Payment endpoints

### Phase 3: Frontend Foundation (Week 3)
- [ ] Next.js setup with Tailwind + shadcn/ui
- [ ] Authentication flow
- [ ] Layout components (navbar, sidebar)
- [ ] Dashboard page

### Phase 4: Core Frontend (Week 4)
- [ ] Client management pages
- [ ] Invoice management pages
- [ ] Quote management pages
- [ ] Payment management pages

### Phase 5: Advanced Features (Week 5)
- [ ] PDF generation
- [ ] Email sending
- [ ] Reports
- [ ] Settings management
- [ ] User management

### Phase 6: Polish & Migration (Week 6)
- [ ] Data migration script
- [ ] Testing
- [ ] Documentation
- [ ] Deployment setup

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 6+
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## 📝 Notes

1. **Backward Compatibility**: The new system will have a migration script to import existing MySQL data.

2. **API-First**: Backend is completely decoupled, allowing mobile apps or other frontends.

3. **Real-time**: Consider adding WebSocket support for live updates.

4. **Multi-tenancy**: Architecture supports future multi-tenant setup.
