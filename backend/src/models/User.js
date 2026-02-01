import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required']
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'user', 'viewer'],
    default: 'user'
  },
  userType: {
    type: Number,
    enum: [0, 1], // 0 = regular user, 1 = admin (system level)
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profile: {
    name: { type: String, default: '' },
    company: { type: String, default: '' },
    address1: { type: String, default: '' },
    address2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
    country: { type: String, default: 'IN' },
    phone: { type: String, default: '' },
    mobile: { type: String, default: '' },
    fax: { type: String, default: '' },
    web: { type: String, default: '' },
    vatId: { type: String, default: '' },
    taxCode: { type: String, default: '' },
    invoicingContact: { type: String, default: '' }
  },
  bankDetails: {
    bank: { type: String, default: '' },
    iban: { type: String, default: '' },
    bic: { type: String, default: '' },
    remittanceText: { type: String, default: '' }
  },
  settings: {
    language: { type: String, default: 'system' },
    allClients: { type: Boolean, default: false }
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  refreshToken: String
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      email: this.email, 
      userType: this.userType,
      company: this.company,
      role: this.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function() {
  const refreshToken = jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  this.refreshToken = refreshToken;
  return refreshToken;
};

// Get public profile (without sensitive data)
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    email: this.email,
    company: this.company,
    role: this.role,
    userType: this.userType,
    isActive: this.isActive,
    profile: this.profile,
    bankDetails: this.bankDetails,
    settings: this.settings,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export default mongoose.model('User', userSchema);
