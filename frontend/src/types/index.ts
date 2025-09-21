export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'hr';
}

export interface JobRole {
  _id: string;
  title: string;
  description: string;
  requiredSkills: RequiredSkill[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  department: string;
  isActive: boolean;
  candidateCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequiredSkill {
  skill: string;
  weight: number;
}

export interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  resumeFileName: string;
  resumePath: string;
  extractedText: string;
  skills: string[];
  experience: {
    years: number;
    companies: Company[];
  };
  education: Education[];
  jobRoleScores: JobRoleScore[];
  bestMatchJobRole: JobRole;
  bestMatchScore: number;
  status: 'new' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  name: string;
  position: string;
  duration: string;
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface JobRoleScore {
  jobRole: JobRole;
  score: number;
  matchedSkills: MatchedSkill[];
  breakdown?: {
    skillsScore: number;
    experienceBonus: number;
    educationBonus: number;
  };
}

export interface MatchedSkill {
  skill: string;
  weight: number;
  matchType?: 'direct' | 'text';
}

export interface DashboardStats {
  overview: {
    totalCandidates: number;
    totalJobRoles: number;
    avgScore: number;
  };
  statusStats: {
    [key: string]: number;
  };
  scoreDistribution: Array<{
    _id: number;
    count: number;
  }>;
  topJobRoles: Array<{
    _id: string;
    jobRoleTitle: string;
    count: number;
    avgScore: number;
  }>;
  recentCandidates: Candidate[];
}

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
}

export interface UploadResult {
  successful: Array<{
    filename: string;
    candidateId: string;
    name: string;
    email: string;
    bestMatchScore: number;
  }>;
  failed: Array<{
    filename: string;
    error: string;
  }>;
}

export interface BulkUploadResponse {
  message: string;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  results: UploadResult;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface CandidateFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  jobRole?: string;
  minScore?: number;
  maxScore?: number;
  skills?: string;
  status?: string;
  search?: string;
}
