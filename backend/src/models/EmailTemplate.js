import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Template title is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['invoice', 'quote', 'payment', 'overdue', 'custom'],
    default: 'custom'
  },
  subject: {
    type: String,
    required: [true, 'Subject is required']
  },
  body: {
    type: String,
    required: [true, 'Body is required']
  },
  fromName: {
    type: String,
    default: ''
  },
  fromEmail: {
    type: String,
    default: ''
  },
  cc: {
    type: String,
    default: ''
  },
  bcc: {
    type: String,
    default: ''
  },
  pdfTemplate: {
    type: String,
    default: ''
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

// Available placeholders for email templates
emailTemplateSchema.statics.placeholders = {
  invoice: [
    '{invoice_number}', '{invoice_date}', '{invoice_due_date}',
    '{invoice_total}', '{invoice_balance}', '{invoice_url}',
    '{client_name}', '{client_company}', '{client_email}',
    '{user_name}', '{user_company}', '{user_email}'
  ],
  quote: [
    '{quote_number}', '{quote_date}', '{quote_expires}',
    '{quote_total}', '{quote_url}',
    '{client_name}', '{client_company}', '{client_email}',
    '{user_name}', '{user_company}', '{user_email}'
  ],
  payment: [
    '{payment_amount}', '{payment_date}', '{payment_method}',
    '{invoice_number}', '{invoice_balance}',
    '{client_name}', '{user_name}'
  ]
};

export default mongoose.model('EmailTemplate', emailTemplateSchema);
