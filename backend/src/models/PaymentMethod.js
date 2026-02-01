import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema({
  belongsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Payment method name is required'],
    trim: true
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

// Ensure only one default per company
paymentMethodSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, belongsTo: this.belongsTo },
      { isDefault: false }
    );
  }
  next();
});

export default mongoose.model('PaymentMethod', paymentMethodSchema);
