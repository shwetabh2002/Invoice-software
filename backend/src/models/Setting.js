import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'invoice', 'quote', 'email', 'pdf', 'payment', 'appearance', 'advanced'],
    default: 'general'
  }
}, {
  timestamps: true
});

// Static method to get a setting value
settingSchema.statics.getValue = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set a setting value
settingSchema.statics.setValue = async function(key, value, category = 'general') {
  return await this.findOneAndUpdate(
    { key },
    { key, value, category },
    { upsert: true, new: true }
  );
};

// Static method to get all settings as an object
settingSchema.statics.getAllAsObject = async function() {
  const settings = await this.find();
  const obj = {};
  settings.forEach(s => {
    obj[s.key] = s.value;
  });
  return obj;
};

// Static method to get settings by category
settingSchema.statics.getByCategory = async function(category) {
  const settings = await this.find({ category });
  const obj = {};
  settings.forEach(s => {
    obj[s.key] = s.value;
  });
  return obj;
};

export default mongoose.model('Setting', settingSchema);
