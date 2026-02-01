import mongoose from 'mongoose';

const familySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Family name is required'],
    trim: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Family', familySchema);
