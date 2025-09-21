const mongoose = require('mongoose');

const jobRoleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  requiredSkills: [{
    skill: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      default: 1,
      min: 0.1,
      max: 5
    }
  }],
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'lead'],
    default: 'mid'
  },
  department: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Who owns this job role
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Ensure job role titles are unique per user
jobRoleSchema.index({ title: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('JobRole', jobRoleSchema);
