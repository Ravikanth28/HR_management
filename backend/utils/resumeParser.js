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

// NEW: split a single document containing multiple resumes into chunks
const splitMultipleResumes = (text) => {
  if (!text || text.trim().length === 0) return [];

  // Normalize newlines and whitespace
  let normalized = text.replace(/\r\n?/g, '\n');

  // Heuristics for boundaries:
  // 1) Form feed (page breaks) from PDFs
  // 2) Repeated email occurrences (each resume typically has exactly one email)
  // 3) Common headers like "Curriculum Vitae", "Resume", "RESUME"
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const headerRegex = /(curriculum vitae|resume|bio-data|cv)/i;

  // Try splitting by emails first
  const emailMatches = [...normalized.matchAll(emailRegex)].map(m => ({ index: m.index || 0 }));

  if (emailMatches.length <= 1) {
    // Fallback: split by repeated headers (if present multiple times)
    const headerIndices = [];
    const lines = normalized.split('\n');
    let runningIndex = 0;
    for (const line of lines) {
      if (headerRegex.test(line)) {
        headerIndices.push(runningIndex);
      }
      runningIndex += line.length + 1; // +1 for newline
    }

    if (headerIndices.length <= 1) {
      // No obvious multiple resumes; return as single
      return [normalized];
    }

    const chunks = [];
    for (let i = 0; i < headerIndices.length; i++) {
      const start = headerIndices[i];
      const end = i < headerIndices.length - 1 ? headerIndices[i + 1] : normalized.length;
      const chunk = normalized.slice(start, end).trim();
      if (chunk.length > 100) chunks.push(chunk);
    }
    return chunks;
  }

  // Build chunks around email boundaries. We try to cut a bit before the email at a paragraph break
  const boundaries = [0];
  for (let i = 1; i < emailMatches.length; i++) {
    const idx = emailMatches[i].index;
    // find previous double newline before this email to split cleanly
    const before = normalized.lastIndexOf('\n\n', idx);
    const boundary = before > boundaries[boundaries.length - 1] + 50 ? before : idx; // ensure some minimal distance
    boundaries.push(boundary);
  }
  boundaries.push(normalized.length);

  const chunks = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const chunk = normalized.slice(start, end).trim();
    if (chunk.length > 100) {
      // Keep only chunks that look like resumes (must have at least an email)
      if (emailRegex.test(chunk)) {
        chunks.push(chunk);
      }
    }
  }

  // If our splitting somehow produced nothing, fallback to single
  return chunks.length > 0 ? chunks : [normalized];
};

// NEW: convenience to parse multiple resumes from a single text
const parseMultipleResumes = (text) => {
  const chunks = splitMultipleResumes(text);
  return chunks.map(parseResumeData);
};

module.exports = {
  extractTextFromFile,
  parseResumeData,
  // new exports
  splitMultipleResumes,
  parseMultipleResumes,
};
