import mongoose from 'mongoose';

const invoiceGroupSchema = new mongoose.Schema({
  belongsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Series name is required'],
    trim: true
  },
  // Type of documents this series is for
  documentType: {
    type: String,
    enum: ['invoice', 'quotation', 'both'],
    default: 'both'
  },
  // Format string with placeholders: {{{id}}}, {{{year}}}, {{{month}}}
  identifierFormat: {
    type: String,
    required: [true, 'Identifier format is required'],
    default: '{{{id}}}'
  },
  nextId: {
    type: Number,
    default: 1,
    min: 1
  },
  leftPad: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate the next number based on format
invoiceGroupSchema.methods.generateNumber = function() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  let id = this.nextId.toString();
  if (this.leftPad > 0) {
    id = id.padStart(this.leftPad, '0');
  }
  
  let number = this.identifierFormat
    .replace('{{{id}}}', id)
    .replace('{{{year}}}', year)
    .replace('{{{month}}}', month);
  
  return number;
};

// Increment the next ID
invoiceGroupSchema.methods.incrementNextId = async function() {
  this.nextId += 1;
  await this.save();
  return this.nextId;
};

// Ensure only one default per company per type
invoiceGroupSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, belongsTo: this.belongsTo, documentType: this.documentType, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

export default mongoose.model('InvoiceGroup', invoiceGroupSchema);
