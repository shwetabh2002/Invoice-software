import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Task name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  finishDate: {
    type: Date
  },
  status: {
    type: Number,
    enum: [0, 1, 2, 3, 4], // 0=not started, 1=in progress, 2=complete, 3=invoiced, 4=cancelled
    default: 0
  },
  taxRate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaxRate'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (this.status >= 2) return false; // Complete, invoiced, or cancelled
  if (!this.finishDate) return false;
  return new Date() > this.finishDate;
});

// Static: status labels
taskSchema.statics.statusLabels = {
  0: { label: 'Not Started', class: 'secondary' },
  1: { label: 'In Progress', class: 'primary' },
  2: { label: 'Complete', class: 'success' },
  3: { label: 'Invoiced', class: 'info' },
  4: { label: 'Cancelled', class: 'danger' }
};

// Indexes
taskSchema.index({ project: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ finishDate: 1 });

export default mongoose.model('Task', taskSchema);
