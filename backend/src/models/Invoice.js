import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Invoice item schema (embedded)
const invoiceItemSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Item name is required'],
    trim: true,
    minlength: [1, 'Item name cannot be empty']
  },
  description: { type: String, default: '', trim: true },
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0'],
    default: 1 
  },
  price: { 
    type: Number, 
    required: [true, 'Price is required'],
    min: [0.01, 'Price must be greater than 0']
  },
  discountAmount: { 
    type: Number, 
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  taxRate: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TaxRate' 
  },
  taxRatePercent: { type: Number, default: 0 }, // Stored for historical accuracy
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product' 
  },
  unit: { type: String, default: '' },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  order: { type: Number, default: 0 },
  isRecurring: { type: Boolean, default: false },
  date: { type: Date },
  // Calculated amounts (stored for performance)
  amounts: {
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }
}, { _id: true });

// Invoice tax rate schema (embedded)
const invoiceTaxRateSchema = new mongoose.Schema({
  taxRate: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TaxRate',
    required: true
  },
  includeItemTax: { type: Boolean, default: false },
  amount: { type: Number, default: 0 }
}, { _id: true });

// Recurring invoice schema (embedded)
const recurringSchema = new mongoose.Schema({
  startDate: { type: Date },
  endDate: { type: Date },
  frequency: { 
    type: String, 
    enum: ['', 'weekly', 'biweekly', 'monthly', 'quarterly', 'biannually', 'annually']
  },
  nextDate: { type: Date }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  belongsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true
  },
  invoiceNumber: {
    type: String,
    trim: true,
    sparse: true
  },
  urlKey: {
    type: String,
    unique: true,
    default: () => uuidv4().replace(/-/g, '')
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  invoiceGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvoiceGroup',
    required: [true, 'Invoice group is required']
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'paid'],
    default: 'draft'
  },
  isReadOnly: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: ''
  },
  dates: {
    created: { type: Date, default: Date.now },
    due: { type: Date, required: true },
    modified: { type: Date, default: Date.now }
  },
  items: [invoiceItemSchema],
  amounts: {
    subtotal: { type: Number, default: 0 },
    itemTaxTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 }
  },
  taxRates: [invoiceTaxRateSchema],
  terms: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentMethod'
  },
  sign: {
    type: Number,
    enum: [1, -1],
    default: 1 // -1 for credit invoices
  },
  creditInvoiceParent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  recurring: recurringSchema,
  // For quote conversion tracking
  quote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: is overdue
invoiceSchema.virtual('isOverdue').get(function() {
  if (this.status === 'paid' || this.status === 'draft') return false;
  return new Date() > this.dates.due;
});

// Virtual: days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  const diff = new Date() - this.dates.due;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Virtual: is recurring
invoiceSchema.virtual('isRecurring').get(function() {
  return this.recurring?.nextDate != null;
});

// Calculate item amounts
invoiceItemSchema.methods.calculateAmounts = function() {
  const subtotal = this.quantity * this.price;
  const discount = this.discountAmount || 0;
  const taxableAmount = subtotal - discount;
  const tax = taxableAmount * (this.taxRatePercent / 100);
  
  this.amounts = {
    subtotal,
    discount,
    tax,
    total: taxableAmount + tax
  };
  
  return this.amounts;
};

// Calculate invoice totals
invoiceSchema.methods.calculateTotals = function() {
  let subtotal = 0;
  let itemTaxTotal = 0;
  
  // Calculate each item
  this.items.forEach(item => {
    const itemSubtotal = item.quantity * item.price;
    const itemDiscount = item.discountAmount || 0;
    const taxableAmount = itemSubtotal - itemDiscount;
    const itemTax = taxableAmount * ((item.taxRatePercent || 0) / 100);
    
    item.amounts = {
      subtotal: itemSubtotal,
      discount: itemDiscount,
      tax: itemTax,
      total: taxableAmount + itemTax
    };
    
    subtotal += itemSubtotal;
    itemTaxTotal += itemTax;
  });
  
  // Apply global discount
  let discountedSubtotal = subtotal;
  if (this.amounts.discountPercent > 0) {
    discountedSubtotal -= subtotal * (this.amounts.discountPercent / 100);
  }
  if (this.amounts.discountAmount > 0) {
    discountedSubtotal -= this.amounts.discountAmount;
  }
  
  // Calculate global tax rates
  let globalTaxTotal = 0;
  this.taxRates.forEach(tr => {
    // Global tax calculation logic would go here
    globalTaxTotal += tr.amount;
  });
  
  const total = (discountedSubtotal + itemTaxTotal + globalTaxTotal) * this.sign;
  const balance = total - this.amounts.paid;
  
  this.amounts.subtotal = subtotal;
  this.amounts.itemTaxTotal = itemTaxTotal;
  this.amounts.taxTotal = globalTaxTotal;
  this.amounts.total = Math.abs(total);
  this.amounts.balance = Math.abs(balance);
  
  return this.amounts;
};

// Pre-save hook to update modified date
invoiceSchema.pre('save', function(next) {
  this.dates.modified = new Date();
  next();
});

// Indexes
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ urlKey: 1 });
invoiceSchema.index({ client: 1 });
invoiceSchema.index({ user: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ 'dates.created': -1 });
invoiceSchema.index({ 'dates.due': 1 });
invoiceSchema.index({ 'amounts.balance': 1 });

export default mongoose.model('Invoice', invoiceSchema);
