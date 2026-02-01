import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Quotation item schema (embedded)
const quoteItemSchema = new mongoose.Schema({
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
  taxRatePercent: { type: Number, default: 0 },
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product' 
  },
  unit: { type: String, default: '' },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  order: { type: Number, default: 0 },
  amounts: {
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }
}, { _id: true });

// Quote tax rate schema (embedded)
const quoteTaxRateSchema = new mongoose.Schema({
  taxRate: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TaxRate',
    required: true
  },
  includeItemTax: { type: Boolean, default: false },
  amount: { type: Number, default: 0 }
}, { _id: true });

const quoteSchema = new mongoose.Schema({
  belongsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true
  },
  quoteNumber: {
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
  // Reference to converted invoice
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'approved', 'rejected', 'cancelled'],
    default: 'draft'
  },
  password: {
    type: String,
    default: ''
  },
  dates: {
    created: { type: Date, default: Date.now },
    expires: { type: Date, required: true },
    modified: { type: Date, default: Date.now }
  },
  items: [quoteItemSchema],
  amounts: {
    subtotal: { type: Number, default: 0 },
    itemTaxTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  taxRates: [quoteTaxRateSchema],
  notes: {
    type: String,
    default: ''
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: is expired
quoteSchema.virtual('isExpired').get(function() {
  if (this.status === 'approved' || this.invoice) return false;
  return new Date() > this.dates.expires;
});

// Virtual: is converted to invoice
quoteSchema.virtual('isConverted').get(function() {
  return this.invoice != null;
});

// Calculate quote totals
quoteSchema.methods.calculateTotals = function() {
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
    globalTaxTotal += tr.amount;
  });
  
  const total = discountedSubtotal + itemTaxTotal + globalTaxTotal;
  
  this.amounts.subtotal = subtotal;
  this.amounts.itemTaxTotal = itemTaxTotal;
  this.amounts.taxTotal = globalTaxTotal;
  this.amounts.total = total;
  
  return this.amounts;
};

// Pre-save hook
quoteSchema.pre('save', function(next) {
  this.dates.modified = new Date();
  next();
});

// Indexes
quoteSchema.index({ quoteNumber: 1 });
quoteSchema.index({ urlKey: 1 });
quoteSchema.index({ client: 1 });
quoteSchema.index({ user: 1 });
quoteSchema.index({ status: 1 });
quoteSchema.index({ 'dates.created': -1 });
quoteSchema.index({ 'dates.expires': 1 });

export default mongoose.model('Quote', quoteSchema);
