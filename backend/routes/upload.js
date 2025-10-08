const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Candidate = require('../models/Candidate');
const JobRole = require('../models/JobRole');
const { extractTextFromFile, parseResumeData, splitMultipleResumes } = require('../utils/resumeParser');
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
  const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'), false);
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
    let extractedText;

    // Handle text files differently - read directly as text
    if (fileExt === 'txt') {
      extractedText = fs.readFileSync(filePath, 'utf8');
    } else {
      // Extract text from binary formats (PDF, DOC, DOCX)
      extractedText = await extractTextFromFile(filePath, fileExt);
    }
    
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

    // Check if candidate already exists (scoped by user)
    const existingCandidate = await Candidate.findOne({ 
      email: candidateData.email,
      createdBy: req.user.id
    });
    if (existingCandidate) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        message: 'Candidate with this email already exists' 
      });
    }

    // Get all active job roles for scoring (scoped to user)
    const jobRoles = await JobRole.find({ isActive: true, createdBy: req.user.id });
    
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
      bestMatchScore: scoringResults.bestMatchScore,
      createdBy: req.user.id
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

        // Extract text from resume file
        let extractedText;

        // Handle text files differently - read directly as text
        if (fileExt === 'txt') {
          extractedText = fs.readFileSync(filePath, 'utf8');
        } else {
          // Extract text from binary formats (PDF, DOC, DOCX)
          extractedText = await extractTextFromFile(filePath, fileExt);
        }
        
        if (!extractedText || extractedText.trim().length === 0) {
          fs.unlinkSync(filePath);
          results.failed.push({
            filename: file.originalname,
            error: 'Could not extract text from resume'
          });
          continue;
        }

        // NEW: split single file that contains multiple resumes
        const chunks = splitMultipleResumes(extractedText);
        console.log(`Found ${chunks.length} resume chunks in ${file.originalname}`);

        if (chunks.length === 0) {
          fs.unlinkSync(filePath);
          results.failed.push({
            filename: file.originalname,
            error: 'Unable to detect resumes in this file'
          });
          continue;
        }

        let createdAtLeastOne = false;
        for (let idx = 0; idx < chunks.length; idx++) {
          const chunkText = chunks[idx];
          console.log(`Processing chunk ${idx + 1}/${chunks.length} for ${file.originalname}`);

          const candidateData = parseResumeData(chunkText);
          candidateData.extractedText = chunkText;

          console.log(`Parsed candidate: ${candidateData.name} - ${candidateData.email}`);

          // Validate required fields in each chunk
          if (!candidateData.name || !candidateData.email) {
            console.log(`Skipping chunk ${idx + 1} - missing name or email`);
            results.failed.push({
              filename: `${file.originalname} (section ${idx + 1})`,
              error: 'Could not extract required information (name, email)'
            });
            continue;
          }

          // Check duplicate by email (scoped by user)
          const existingCandidate = await Candidate.findOne({
            email: candidateData.email,
            createdBy: req.user.id
          });
          if (existingCandidate) {
            console.log(`Skipping chunk ${idx + 1} - duplicate email: ${candidateData.email}`);
            results.failed.push({
              filename: `${file.originalname} (section ${idx + 1})`,
              error: 'Candidate with this email already exists'
            });
            continue;
          }

          // Score and persist
          const scoringResults = await calculateAllJobRoleScores(candidateData, jobRoles);

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
            bestMatchScore: scoringResults.bestMatchScore,
            createdBy: req.user.id
          });

          await candidate.save();
          createdAtLeastOne = true;
          console.log(`✅ Saved candidate: ${candidate.name} (${candidate.email})`);

          results.successful.push({
            filename: `${file.originalname} (section ${idx + 1})`,
            candidateId: candidate._id,
            name: candidate.name,
            email: candidate.email,
            bestMatchScore: candidate.bestMatchScore
          });
        }

        // Only delete the physical file if nothing usable was created
        if (!createdAtLeastOne) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

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
