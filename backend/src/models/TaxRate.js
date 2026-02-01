import mongoose from 'mongoose';

const taxRateSchema = new mongoose.Schema({
  belongsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Tax rate name is required'],
    trim: true
  },
  percent: {
    type: Number,
    required: [true, 'Tax rate percentage is required'],
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%']
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

// Ensure only one default tax rate per company
taxRateSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, belongsTo: this.belongsTo },
      { isDefault: false }
    );
  }
  next();
});

export default mongoose.model('TaxRate', taxRateSchema);
