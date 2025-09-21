const express = require('express');
const JobRole = require('../models/JobRole');
const Candidate = require('../models/Candidate');
const { auth, adminAuth } = require('../middleware/auth');
const { calculateAllJobRoleScores } = require('../utils/atsScoring');

const router = express.Router();

// Get all job roles
router.get('/', auth, async (req, res) => {
  try {
    const { active } = req.query;
    const filter = { createdBy: req.user.id };
    if (active === 'true') filter.isActive = true;
    
    const jobRoles = await JobRole.find(filter).sort({ createdAt: -1 });
    
    // Add candidate count for each job role
    const jobRolesWithStats = await Promise.all(
      jobRoles.map(async (jobRole) => {
        const candidateCount = await Candidate.countDocuments({
          bestMatchJobRole: jobRole._id,
          createdBy: req.user.id
        });
        
        return {
          ...jobRole.toObject(),
          candidateCount
        };
      })
    );

    res.json({
      jobRoles: jobRolesWithStats,
      total: jobRolesWithStats.length
    });
  } catch (error) {
    console.error('Get job roles error:', error);
    res.status(500).json({ message: 'Error fetching job roles' });
  }
});

// Get single job role
router.get('/:id', auth, async (req, res) => {
  try {
    const jobRole = await JobRole.findById(req.params.id);
    
    if (!jobRole) {
      return res.status(404).json({ message: 'Job role not found' });
    }

    // Ownership check
    if (String(jobRole.createdBy) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Job role not found' });
    }

    // Get candidates for this job role
    const candidates = await Candidate.find({
      bestMatchJobRole: jobRole._id,
      createdBy: req.user.id
    }).select('name email bestMatchScore status').sort({ bestMatchScore: -1 });

    res.json({
      jobRole,
      candidates,
      candidateCount: candidates.length
    });
  } catch (error) {
    console.error('Get job role error:', error);
    res.status(500).json({ message: 'Error fetching job role' });
  }
});

// Create new job role
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, requiredSkills, experienceLevel, department } = req.body;

    // Validate required fields
    if (!title || !description || !requiredSkills || !department) {
      return res.status(400).json({ 
        message: 'Title, description, required skills, and department are required' 
      });
    }

    // Check if job role with same title exists for this user
    const existingJobRole = await JobRole.findOne({ title, createdBy: req.user.id });
    if (existingJobRole) {
      return res.status(400).json({ 
        message: 'Job role with this title already exists' 
      });
    }

    // Create new job role
    const jobRole = new JobRole({
      title,
      description,
      requiredSkills,
      experienceLevel: experienceLevel || 'mid',
      department,
      createdBy: req.user.id
    });

    await jobRole.save();

    // Recalculate scores for all candidates
    const candidates = await Candidate.find({ createdBy: req.user.id });
    const jobRoles = await JobRole.find({ isActive: true, createdBy: req.user.id });

    for (const candidate of candidates) {
      const candidateData = {
        skills: candidate.skills,
        extractedText: candidate.extractedText,
        experience: candidate.experience,
        education: candidate.education
      };

      const scoringResults = await calculateAllJobRoleScores(candidateData, jobRoles);
      
      candidate.jobRoleScores = scoringResults.jobRoleScores;
      candidate.bestMatchJobRole = scoringResults.bestMatchJobRole;
      candidate.bestMatchScore = scoringResults.bestMatchScore;
      
      await candidate.save();
    }

    res.status(201).json({
      message: 'Job role created successfully',
      jobRole
    });
  } catch (error) {
    console.error('Create job role error:', error);
    res.status(500).json({ message: 'Error creating job role' });
  }
});

// Update job role
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, requiredSkills, experienceLevel, department, isActive } = req.body;

    const jobRole = await JobRole.findById(req.params.id);
    if (!jobRole) {
      return res.status(404).json({ message: 'Job role not found' });
    }

    // Ownership check
    if (String(jobRole.createdBy) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Job role not found' });
    }

    // Check if title is being changed and if new title already exists
    if (title && title !== jobRole.title) {
      const existingJobRole = await JobRole.findOne({ title, createdBy: req.user.id, _id: { $ne: req.params.id } });
      if (existingJobRole) {
        return res.status(400).json({ 
          message: 'Job role with this title already exists' 
        });
      }
    }

    // Update job role
    if (title) jobRole.title = title;
    if (description) jobRole.description = description;
    if (requiredSkills) jobRole.requiredSkills = requiredSkills;
    if (experienceLevel) jobRole.experienceLevel = experienceLevel;
    if (department) jobRole.department = department;
    if (typeof isActive === 'boolean') jobRole.isActive = isActive;

    await jobRole.save();

    // Recalculate scores for all candidates if skills or other criteria changed
    if (requiredSkills || experienceLevel) {
      const candidates = await Candidate.find({ createdBy: req.user.id });
      const jobRoles = await JobRole.find({ isActive: true, createdBy: req.user.id });

      for (const candidate of candidates) {
        const candidateData = {
          skills: candidate.skills,
          extractedText: candidate.extractedText,
          experience: candidate.experience,
          education: candidate.education
        };

        const scoringResults = await calculateAllJobRoleScores(candidateData, jobRoles);
        
        candidate.jobRoleScores = scoringResults.jobRoleScores;
        candidate.bestMatchJobRole = scoringResults.bestMatchJobRole;
        candidate.bestMatchScore = scoringResults.bestMatchScore;
        
        await candidate.save();
      }
    }

    res.json({
      message: 'Job role updated successfully',
      jobRole
    });
  } catch (error) {
    console.error('Update job role error:', error);
    res.status(500).json({ message: 'Error updating job role' });
  }
});

// Delete job role
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const jobRole = await JobRole.findById(req.params.id);
    if (!jobRole) {
      return res.status(404).json({ message: 'Job role not found' });
    }

    // Ownership check
    if (String(jobRole.createdBy) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Job role not found' });
    }

    // Check if any candidates are associated with this job role
    const candidateCount = await Candidate.countDocuments({
      createdBy: req.user.id,
      $or: [
        { bestMatchJobRole: jobRole._id },
        { 'jobRoleScores.jobRole': jobRole._id }
      ]
    });

    if (candidateCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete job role. ${candidateCount} candidates are associated with it. Consider deactivating instead.` 
      });
    }

    await JobRole.findByIdAndDelete(req.params.id);

    res.json({ message: 'Job role deleted successfully' });
  } catch (error) {
    console.error('Delete job role error:', error);
    res.status(500).json({ message: 'Error deleting job role' });
  }
});

// Initialize default job roles
router.post('/initialize-defaults', adminAuth, async (req, res) => {
  try {
    const defaultJobRoles = [
      {
        title: 'Software Engineer',
        description: 'Develop and maintain software applications using modern technologies',
        requiredSkills: [
          { skill: 'JavaScript', weight: 3 },
          { skill: 'React', weight: 2 },
          { skill: 'Node.js', weight: 2 },
          { skill: 'Git', weight: 1 },
          { skill: 'SQL', weight: 1 }
        ],
        experienceLevel: 'mid',
        department: 'Engineering'
      },
      {
        title: 'Data Analyst',
        description: 'Analyze data to provide business insights and recommendations',
        requiredSkills: [
          { skill: 'Python', weight: 3 },
          { skill: 'SQL', weight: 3 },
          { skill: 'Excel', weight: 2 },
          { skill: 'Data Analysis', weight: 2 },
          { skill: 'Tableau', weight: 1 }
        ],
        experienceLevel: 'mid',
        department: 'Analytics'
      },
      {
        title: 'HR Executive',
        description: 'Manage human resources operations and employee relations',
        requiredSkills: [
          { skill: 'Communication', weight: 3 },
          { skill: 'Leadership', weight: 2 },
          { skill: 'Project Management', weight: 2 },
          { skill: 'Excel', weight: 1 }
        ],
        experienceLevel: 'mid',
        department: 'Human Resources'
      },
      {
        title: 'UI/UX Designer',
        description: 'Design user interfaces and user experiences for digital products',
        requiredSkills: [
          { skill: 'Figma', weight: 3 },
          { skill: 'UI/UX', weight: 3 },
          { skill: 'Design', weight: 2 },
          { skill: 'Photoshop', weight: 1 },
          { skill: 'Illustrator', weight: 1 }
        ],
        experienceLevel: 'mid',
        department: 'Design'
      }
    ];

    const createdJobRoles = [];
    
    for (const jobRoleData of defaultJobRoles) {
      const existingJobRole = await JobRole.findOne({ title: jobRoleData.title, createdBy: req.user.id });
      if (!existingJobRole) {
        const jobRole = new JobRole({ ...jobRoleData, createdBy: req.user.id });
        await jobRole.save();
        createdJobRoles.push(jobRole);
      }
    }

    res.json({
      message: `Initialized ${createdJobRoles.length} default job roles`,
      createdJobRoles
    });
  } catch (error) {
    console.error('Initialize defaults error:', error);
    res.status(500).json({ message: 'Error initializing default job roles' });
  }
});

module.exports = router;
