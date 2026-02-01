import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  content: { type: String, required: true }
}, { _id: true, timestamps: false });

const clientSchema = new mongoose.Schema({
  belongsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  surname: {
    type: String,
    trim: true,
    default: ''
  },
  title: {
    type: String,
    enum: ['', 'mr', 'mrs', 'ms', 'dr', 'prof'],
    default: ''
  },
  company: {
    type: String,
    trim: true,
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
  contact: {
    email: { 
      type: String, 
      lowercase: true, 
      trim: true,
      default: ''
    },
    phone: { type: String, default: '' },
    mobile: { type: String, default: '' },
    fax: { type: String, default: '' },
    web: { type: String, default: '' }
  },
  tax: {
    vatId: { type: String, default: '' },
    taxCode: { type: String, default: '' }
  },
  invoicingContact: {
    type: String,
    default: ''
  },
  preferredLanguage: {
    type: String,
    default: 'en'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  eInvoicing: {
    active: { type: Boolean, default: false },
    version: { type: String, default: '' }
  },
  // For Swiss medical invoicing (SUMEX)
  sumex: {
    birthdate: Date,
    gender: { type: Number, enum: [0, 1, 2], default: 0 }, // 0=unknown, 1=male, 2=female
    avs: String,
    insuredNumber: String,
    veka: String
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  notes: [noteSchema],
  // Reference to user who created/owns this client
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
clientSchema.virtual('fullName').get(function() {
  return this.surname ? `${this.name} ${this.surname}` : this.name;
});

// Virtual for display name (with company)
clientSchema.virtual('displayName').get(function() {
  if (this.company) {
    return this.fullName ? `${this.fullName} (${this.company})` : this.company;
  }
  return this.fullName;
});

// Indexes
clientSchema.index({ name: 1 });
clientSchema.index({ company: 1 });
clientSchema.index({ 'contact.email': 1 });
clientSchema.index({ isActive: 1 });
clientSchema.index({ createdAt: -1 });

// Text search index - use 'none' for language to disable stemming
clientSchema.index(
  {
    name: 'text',
    surname: 'text',
    company: 'text',
    'contact.email': 'text'
  },
  {
    default_language: 'none',
    language_override: 'textSearchLanguage' // Use non-existent field to prevent conflicts
  }
);

export default mongoose.model('Client', clientSchema);
