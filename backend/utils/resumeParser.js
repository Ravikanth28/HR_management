const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

// Extract text from different file formats
const extractTextFromFile = async (filePath, fileType) => {
  try {
    switch (fileType) {
      case 'pdf':
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        return pdfData.text;
      
      case 'docx':
        const docxResult = await mammoth.extractRawText({ path: filePath });
        return docxResult.value;
      
      case 'doc':
        // For .doc files, we'll use mammoth as well (it has limited support)
        try {
          const docResult = await mammoth.extractRawText({ path: filePath });
          return docResult.value;
        } catch (error) {
          throw new Error('DOC file format not fully supported. Please convert to DOCX or PDF.');
        }
      
      default:
        throw new Error('Unsupported file format');
    }
  } catch (error) {
    throw new Error(`Failed to extract text: ${error.message}`);
  }
};

// Extract candidate information from resume text
const parseResumeData = (text) => {
  const data = {
    name: '',
    email: '',
    phone: '',
    skills: [],
    experience: {
      years: 0,
      companies: []
    },
    education: []
  };

  // Extract email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    data.email = emailMatch[0];
  }

  // Extract phone number
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    data.phone = phoneMatch[0];
  }

  // Extract name (usually the first line or before email)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    // Try to find name before email or use first meaningful line
    const nameRegex = /^[A-Za-z\s]{2,50}$/;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (nameRegex.test(line) && !line.includes('@') && line.length > 2) {
        data.name = line;
        break;
      }
    }
  }

  // Extract skills (common programming languages and technologies)
  const skillKeywords = [
    'javascript', 'python', 'java', 'react', 'node.js', 'angular', 'vue',
    'html', 'css', 'sql', 'mongodb', 'postgresql', 'mysql', 'git',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'tensorflow',
    'machine learning', 'data analysis', 'excel', 'powerbi', 'tableau',
    'photoshop', 'illustrator', 'figma', 'sketch', 'ui/ux', 'design',
    'marketing', 'seo', 'content writing', 'social media', 'analytics',
    'project management', 'agile', 'scrum', 'leadership', 'communication'
  ];

  const textLower = text.toLowerCase();
  skillKeywords.forEach(skill => {
    if (textLower.includes(skill.toLowerCase())) {
      data.skills.push(skill);
    }
  });

  // Remove duplicates
  data.skills = [...new Set(data.skills)];

  // Extract experience years (simple heuristic)
  const experienceRegex = /(\d+)[\s]*(?:years?|yrs?)[\s]*(?:of\s*)?(?:experience|exp)/gi;
  const expMatch = text.match(experienceRegex);
  if (expMatch) {
    const years = expMatch.map(match => {
      const num = match.match(/\d+/);
      return num ? parseInt(num[0]) : 0;
    });
    data.experience.years = Math.max(...years);
  }

  // Extract education (simple pattern matching)
  const educationKeywords = ['bachelor', 'master', 'phd', 'degree', 'university', 'college', 'institute'];
  const educationLines = lines.filter(line => {
    const lineLower = line.toLowerCase();
    return educationKeywords.some(keyword => lineLower.includes(keyword));
  });

  educationLines.forEach(line => {
    data.education.push({
      degree: line.trim(),
      institution: '',
      year: ''
    });
  });

  return data;
};

module.exports = {
  extractTextFromFile,
  parseResumeData
};
