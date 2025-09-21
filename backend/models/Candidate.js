const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  resumeFileName: {
    type: String,
    required: true
  },
  resumePath: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    required: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    years: {
      type: Number,
      default: 0
    },
    companies: [{
      name: String,
      position: String,
      duration: String
    }]
  },
  education: [{
    degree: String,
    institution: String,
    year: String
  }],
  jobRoleScores: [{
    jobRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobRole'
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    matchedSkills: [{
      skill: String,
      weight: Number
    }]
  }],
  bestMatchJobRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRole'
  },
  bestMatchScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'shortlisted', 'rejected', 'hired'],
    default: 'new'
  },
  // Who uploaded/owns this candidate
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Index for better search performance
candidateSchema.index({ name: 'text', skills: 'text' });
candidateSchema.index({ bestMatchScore: -1 });

module.exports = mongoose.model('Candidate', candidateSchema);
