// Calculate ATS score based on keyword matching
const calculateATSScore = (candidateData, jobRole) => {
  if (!jobRole.requiredSkills || jobRole.requiredSkills.length === 0) {
    return { score: 0, matchedSkills: [] };
  }

  const candidateSkills = candidateData.skills.map(skill => skill.toLowerCase());
  const candidateText = candidateData.extractedText.toLowerCase();
  
  let totalWeight = 0;
  let matchedWeight = 0;
  const matchedSkills = [];

  // Calculate score based on required skills
  jobRole.requiredSkills.forEach(requiredSkill => {
    const skillLower = requiredSkill.skill.toLowerCase();
    const weight = requiredSkill.weight || 1;
    totalWeight += weight;

    // Check if skill is explicitly listed in candidate skills
    const directMatch = candidateSkills.includes(skillLower);
    
    // Check if skill appears in resume text
    const textMatch = candidateText.includes(skillLower);

    if (directMatch || textMatch) {
      matchedWeight += weight;
      matchedSkills.push({
        skill: requiredSkill.skill,
        weight: weight,
        matchType: directMatch ? 'direct' : 'text'
      });
    }
  });

  // Calculate base score (0-80% based on skill matching)
  const baseScore = totalWeight > 0 ? (matchedWeight / totalWeight) * 80 : 0;

  // Add bonus points for experience level matching
  let experienceBonus = 0;
  const candidateYears = candidateData.experience.years;
  
  switch (jobRole.experienceLevel) {
    case 'entry':
      experienceBonus = candidateYears <= 2 ? 10 : candidateYears <= 5 ? 5 : 0;
      break;
    case 'mid':
      experienceBonus = candidateYears >= 2 && candidateYears <= 7 ? 10 : 5;
      break;
    case 'senior':
      experienceBonus = candidateYears >= 5 ? 10 : candidateYears >= 3 ? 5 : 0;
      break;
    case 'lead':
      experienceBonus = candidateYears >= 8 ? 10 : candidateYears >= 5 ? 5 : 0;
      break;
  }

  // Add bonus for education (simple check)
  let educationBonus = 0;
  if (candidateData.education.length > 0) {
    const hasRelevantEducation = candidateData.education.some(edu => {
      const eduText = edu.degree.toLowerCase();
      return eduText.includes('computer') || eduText.includes('engineering') || 
             eduText.includes('science') || eduText.includes('technology') ||
             eduText.includes('business') || eduText.includes('management');
    });
    educationBonus = hasRelevantEducation ? 10 : 5;
  }

  const finalScore = Math.min(100, Math.round(baseScore + experienceBonus + educationBonus));

  return {
    score: finalScore,
    matchedSkills: matchedSkills,
    breakdown: {
      skillsScore: Math.round(baseScore),
      experienceBonus: experienceBonus,
      educationBonus: educationBonus
    }
  };
};

// Calculate scores for all job roles
const calculateAllJobRoleScores = async (candidateData, jobRoles) => {
  const scores = [];
  let bestScore = 0;
  let bestJobRole = null;

  for (const jobRole of jobRoles) {
    const result = calculateATSScore(candidateData, jobRole);
    
    scores.push({
      jobRole: jobRole._id,
      score: result.score,
      matchedSkills: result.matchedSkills,
      breakdown: result.breakdown
    });

    if (result.score > bestScore) {
      bestScore = result.score;
      bestJobRole = jobRole._id;
    }
  }

  return {
    jobRoleScores: scores,
    bestMatchJobRole: bestJobRole,
    bestMatchScore: bestScore
  };
};

module.exports = {
  calculateATSScore,
  calculateAllJobRoleScores
};
