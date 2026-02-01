import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  belongsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  sku: {
    type: String,
    trim: true,
    sparse: true
  },
  price: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0.01, 'Selling price must be greater than 0']
  },
  purchasePrice: {
    type: Number,
    min: [0, 'Purchase price cannot be negative'],
    default: 0,
    validate: {
      validator: function(value) {
        // Purchase price should be less than or equal to selling price (if set)
        return value === 0 || value <= this.price;
      },
      message: 'Purchase price should not exceed selling price'
    }
  },
  family: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family'
  },
  taxRate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaxRate'
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  provider: {
    type: String,
    default: ''
  },
  tariff: {
    type: Number
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
productSchema.index({ name: 'text', description: 'text', sku: 'text' });
productSchema.index({ family: 1 });
productSchema.index({ isActive: 1 });

export default mongoose.model('Product', productSchema);
