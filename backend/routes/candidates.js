const express = require('express');
const fs = require('fs');
const path = require('path');
const Candidate = require('../models/Candidate');
const JobRole = require('../models/JobRole');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all candidates with filtering and sorting
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'bestMatchScore',
      sortOrder = 'desc',
      jobRole,
      minScore,
      maxScore,
      skills,
      status,
      search
    } = req.query;

    // Build filter object
    const filter = { createdBy: req.user.id };
    
    if (jobRole) {
      filter.bestMatchJobRole = jobRole;
    }
    
    if (minScore || maxScore) {
      filter.bestMatchScore = {};
      if (minScore) filter.bestMatchScore.$gte = parseInt(minScore);
      if (maxScore) filter.bestMatchScore.$lte = parseInt(maxScore);
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      filter.skills = { $in: skillsArray };
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const candidates = await Candidate.find(filter)
      .populate('bestMatchJobRole', 'title department')
      .populate('jobRoleScores.jobRole', 'title')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Candidate.countDocuments(filter);

    res.json({
      candidates,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({ message: 'Error fetching candidates' });
  }
});

// Get single candidate
router.get('/:id', auth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('bestMatchJobRole', 'title description department')
      .populate('jobRoleScores.jobRole', 'title department');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Ownership check
    if (String(candidate.createdBy) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    res.json({ candidate });
  } catch (error) {
    console.error('Get candidate error:', error);
    res.status(500).json({ message: 'Error fetching candidate' });
  }
});

// Update candidate status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['new', 'reviewed', 'shortlisted', 'rejected', 'hired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Ownership check
    if (String(candidate.createdBy) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    candidate.status = status;
    await candidate.save();

    res.json({
      message: 'Candidate status updated successfully',
      candidate: {
        id: candidate._id,
        name: candidate.name,
        status: candidate.status
      }
    });
  } catch (error) {
    console.error('Update candidate status error:', error);
    res.status(500).json({ message: 'Error updating candidate status' });
  }
});

// Download candidate resume
router.get('/:id/resume', auth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Ownership check
    if (String(candidate.createdBy) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const resumePath = candidate.resumePath;
    if (!fs.existsSync(resumePath)) {
      return res.status(404).json({ message: 'Resume file not found' });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${candidate.resumeFileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Stream the file
    const fileStream = fs.createReadStream(resumePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({ message: 'Error downloading resume' });
  }
});

// Delete candidate
router.delete('/:id', auth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Ownership check
    if (String(candidate.createdBy) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Delete resume file
    if (fs.existsSync(candidate.resumePath)) {
      fs.unlinkSync(candidate.resumePath);
    }

    // Delete candidate record
    await Candidate.findByIdAndDelete(req.params.id);

    res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('Delete candidate error:', error);
    res.status(500).json({ message: 'Error deleting candidate' });
  }
});

// Get candidates grouped by job roles
router.get('/grouped/by-job-role', auth, async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const jobRoles = await JobRole.find({ isActive: true }).sort({ title: 1 });
    
    const groupedCandidates = await Promise.all(
      jobRoles.map(async (jobRole) => {
        const candidates = await Candidate.find({
          bestMatchJobRole: jobRole._id,
          createdBy: req.user.id
        })
        .select('name email bestMatchScore status')
        .sort({ bestMatchScore: -1 })
        .limit(parseInt(limit));

        return {
          jobRole: {
            id: jobRole._id,
            title: jobRole.title,
            department: jobRole.department
          },
          candidates,
          totalCount: await Candidate.countDocuments({
            bestMatchJobRole: jobRole._id,
            createdBy: req.user.id
          })
        };
      })
    );

    res.json({ groupedCandidates });
  } catch (error) {
    console.error('Get grouped candidates error:', error);
    res.status(500).json({ message: 'Error fetching grouped candidates' });
  }
});

// Get dashboard statistics
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const createdByMatch = { createdBy: req.user.id };
    const totalCandidates = await Candidate.countDocuments(createdByMatch);
    const totalJobRoles = await JobRole.countDocuments({ isActive: true });
    
    const statusStats = await Candidate.aggregate([
      { $match: { createdBy: new (require('mongoose')).Types.ObjectId(req.user.id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const scoreDistribution = await Candidate.aggregate([
      { $match: { createdBy: new (require('mongoose')).Types.ObjectId(req.user.id) } },
      { $bucket: { groupBy: '$bestMatchScore', boundaries: [0, 20, 40, 60, 80, 100], default: 'other', output: { count: { $sum: 1 } } } }
    ]);

    const mongoose = require('mongoose');
    const topJobRoles = await Candidate.aggregate([
      { $match: { createdBy: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$bestMatchJobRole', count: { $sum: 1 }, avgScore: { $avg: '$bestMatchScore' } } },
      { $lookup: { from: 'jobroles', localField: '_id', foreignField: '_id', as: 'jobRole' } },
      { $unwind: '$jobRole' },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { jobRoleTitle: '$jobRole.title', count: 1, avgScore: { $round: ['$avgScore', 1] } } }
    ]);

    const recentCandidates = await Candidate.find({ createdBy: req.user.id })
      .populate('bestMatchJobRole', 'title')
      .select('name email bestMatchScore status createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      overview: {
        totalCandidates,
        totalJobRoles,
        avgScore: await Candidate.aggregate([
          { $match: { createdBy: new (require('mongoose')).Types.ObjectId(req.user.id) } },
          { $group: { _id: null, avgScore: { $avg: '$bestMatchScore' } } }
        ]).then(result => result[0]?.avgScore ? Math.round(result[0].avgScore) : 0)
      },
      statusStats: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      scoreDistribution,
      topJobRoles,
      recentCandidates
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

module.exports = router;
