const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Candidate = require('../models/Candidate');
const JobRole = require('../models/JobRole');
const { extractTextFromFile, parseResumeData } = require('../utils/resumeParser');
const { calculateAllJobRoleScores } = require('../utils/atsScoring');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload single resume
router.post('/resume', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase().substring(1);

    // Extract text from resume
    const extractedText = await extractTextFromFile(filePath, fileExt);
    
    if (!extractedText || extractedText.trim().length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: 'Could not extract text from resume' });
    }

    // Parse candidate data
    const candidateData = parseResumeData(extractedText);
    candidateData.extractedText = extractedText;

    // Validate required fields
    if (!candidateData.name || !candidateData.email) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        message: 'Could not extract required information (name, email) from resume' 
      });
    }

    // Check if candidate already exists
    const existingCandidate = await Candidate.findOne({ email: candidateData.email });
    if (existingCandidate) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        message: 'Candidate with this email already exists' 
      });
    }

    // Get all active job roles for scoring
    const jobRoles = await JobRole.find({ isActive: true });
    
    // Calculate ATS scores
    const scoringResults = await calculateAllJobRoleScores(candidateData, jobRoles);

    // Create candidate record
    const candidate = new Candidate({
      name: candidateData.name,
      email: candidateData.email,
      phone: candidateData.phone,
      resumeFileName: req.file.originalname,
      resumePath: filePath,
      extractedText: candidateData.extractedText,
      skills: candidateData.skills,
      experience: candidateData.experience,
      education: candidateData.education,
      jobRoleScores: scoringResults.jobRoleScores,
      bestMatchJobRole: scoringResults.bestMatchJobRole,
      bestMatchScore: scoringResults.bestMatchScore
    });

    await candidate.save();

    // Populate job role information for response
    await candidate.populate('bestMatchJobRole', 'title');
    await candidate.populate('jobRoleScores.jobRole', 'title');

    res.status(201).json({
      message: 'Resume uploaded and processed successfully',
      candidate: {
        id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        skills: candidate.skills,
        bestMatchJobRole: candidate.bestMatchJobRole,
        bestMatchScore: candidate.bestMatchScore,
        jobRoleScores: candidate.jobRoleScores
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Resume upload error:', error);
    res.status(500).json({ 
      message: 'Error processing resume',
      error: error.message 
    });
  }
});

// Bulk upload resumes
router.post('/bulk-resumes', auth, upload.array('resumes', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const results = {
      successful: [],
      failed: []
    };

    // Get all active job roles for scoring
    const jobRoles = await JobRole.find({ isActive: true });

    for (const file of req.files) {
      try {
        const filePath = file.path;
        const fileExt = path.extname(file.originalname).toLowerCase().substring(1);

        // Extract text from resume
        const extractedText = await extractTextFromFile(filePath, fileExt);
        
        if (!extractedText || extractedText.trim().length === 0) {
          fs.unlinkSync(filePath);
          results.failed.push({
            filename: file.originalname,
            error: 'Could not extract text from resume'
          });
          continue;
        }

        // Parse candidate data
        const candidateData = parseResumeData(extractedText);
        candidateData.extractedText = extractedText;

        // Validate required fields
        if (!candidateData.name || !candidateData.email) {
          fs.unlinkSync(filePath);
          results.failed.push({
            filename: file.originalname,
            error: 'Could not extract required information (name, email)'
          });
          continue;
        }

        // Check if candidate already exists
        const existingCandidate = await Candidate.findOne({ email: candidateData.email });
        if (existingCandidate) {
          fs.unlinkSync(filePath);
          results.failed.push({
            filename: file.originalname,
            error: 'Candidate with this email already exists'
          });
          continue;
        }

        // Calculate ATS scores
        const scoringResults = await calculateAllJobRoleScores(candidateData, jobRoles);

        // Create candidate record
        const candidate = new Candidate({
          name: candidateData.name,
          email: candidateData.email,
          phone: candidateData.phone,
          resumeFileName: file.originalname,
          resumePath: filePath,
          extractedText: candidateData.extractedText,
          skills: candidateData.skills,
          experience: candidateData.experience,
          education: candidateData.education,
          jobRoleScores: scoringResults.jobRoleScores,
          bestMatchJobRole: scoringResults.bestMatchJobRole,
          bestMatchScore: scoringResults.bestMatchScore
        });

        await candidate.save();

        results.successful.push({
          filename: file.originalname,
          candidateId: candidate._id,
          name: candidate.name,
          email: candidate.email,
          bestMatchScore: candidate.bestMatchScore
        });

      } catch (error) {
        // Clean up file on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        results.failed.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    res.status(200).json({
      message: 'Bulk upload completed',
      summary: {
        total: req.files.length,
        successful: results.successful.length,
        failed: results.failed.length
      },
      results: results
    });

  } catch (error) {
    // Clean up all uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    console.error('Bulk upload error:', error);
    res.status(500).json({ 
      message: 'Error processing bulk upload',
      error: error.message 
    });
  }
});

module.exports = router;
