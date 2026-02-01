import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  belongsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'Invoice is required']
  },
  paymentMethod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentMethod'
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  date: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now
  },
  note: {
    type: String,
    default: ''
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true
});

// After saving a payment, update the invoice balance
paymentSchema.post('save', async function() {
  const Invoice = mongoose.model('Invoice');
  const Payment = mongoose.model('Payment');
  
  // Calculate total paid for this invoice
  const payments = await Payment.find({ invoice: this.invoice });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Update invoice
  const invoice = await Invoice.findById(this.invoice);
  if (invoice) {
    invoice.amounts.paid = totalPaid;
    invoice.amounts.balance = invoice.amounts.total - totalPaid;
    
    // Auto-update status to paid if balance is 0
    if (invoice.amounts.balance <= 0 && invoice.status !== 'draft') {
      invoice.status = 'paid';
    }
    
    await invoice.save();
  }
});

// After deleting a payment, update the invoice balance
paymentSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const Invoice = mongoose.model('Invoice');
    const Payment = mongoose.model('Payment');
    
    const payments = await Payment.find({ invoice: doc.invoice });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    
    const invoice = await Invoice.findById(doc.invoice);
    if (invoice) {
      invoice.amounts.paid = totalPaid;
      invoice.amounts.balance = invoice.amounts.total - totalPaid;
      
      // Revert status if unpaid
      if (invoice.amounts.balance > 0 && invoice.status === 'paid') {
        invoice.status = 'sent';
      }
      
      await invoice.save();
    }
  }
});

// Indexes
paymentSchema.index({ invoice: 1 });
paymentSchema.index({ date: -1 });
paymentSchema.index({ paymentMethod: 1 });

export default mongoose.model('Payment', paymentSchema);
