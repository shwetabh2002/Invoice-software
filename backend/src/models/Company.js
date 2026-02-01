import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  logo: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  address: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
    country: { type: String, default: 'IN' }
  },
  taxInfo: {
    gstin: { type: String, default: '' },
    pan: { type: String, default: '' },
    cin: { type: String, default: '' }
  },
  bankDetails: {
    bankName: { type: String, default: '' },
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    branch: { type: String, default: '' }
  },
  settings: {
    currencySymbol: { type: String, default: '₹' },
    currencyCode: { type: String, default: 'INR' },
    dateFormat: { type: String, default: 'DD-MM-YYYY' },
    invoicePrefix: { type: String, default: 'INV' },
    quotePrefix: { type: String, default: 'QUO' },
    invoiceDueAfter: { type: Number, default: 30 },
    quoteExpiresAfter: { type: Number, default: 15 },
    defaultTaxRate: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxRate' },
    invoiceTerms: { type: String, default: '' },
    invoiceFooter: { type: String, default: 'Thank you for your business!' }
  },
  branding: {
    primaryColor: { type: String, default: '#2563eb' },
    accentColor: { type: String, default: '#3b82f6' }
  },
  subscription: {
    plan: { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    expiresAt: { type: Date },
    maxUsers: { type: Number, default: 1 },
    maxClients: { type: Number, default: 50 },
    maxInvoices: { type: Number, default: 100 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Generate slug from name
companySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Indexes
companySchema.index({ slug: 1 });
companySchema.index({ isActive: 1 });

const Company = mongoose.model('Company', companySchema);

export default Company;
