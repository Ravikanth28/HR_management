import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { candidatesAPI } from '../services/api';
import { Candidate } from '../types';
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Phone, 
  Award,
  Briefcase,
  GraduationCap,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const CandidateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCandidate = useCallback(async (candidateId: string) => {
    try {
      setLoading(true);
      const data = await candidatesAPI.getById(candidateId);
      setCandidate(data.candidate);
    } catch (error) {
      console.error('Error fetching candidate:', error);
      toast.error('Failed to load candidate details');
      navigate('/candidates');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (id) {
      fetchCandidate(id);
    }
  }, [id, fetchCandidate]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!candidate) return;

    try {
      await candidatesAPI.updateStatus(candidate._id, newStatus);
      setCandidate(prev => prev ? { ...prev, status: newStatus as any } : null);
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDownloadResume = async () => {
    if (!candidate) return;

    try {
      const response = await candidatesAPI.downloadResume(candidate._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', candidate.resumeFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Resume downloaded');
    } catch (error) {
      toast.error('Failed to download resume');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Candidate not found</p>
        <Link
          to="/candidates"
          className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Candidates
        </Link>
      </div>
    );
  }

  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    reviewed: 'bg-yellow-100 text-yellow-800',
    shortlisted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    hired: 'bg-purple-100 text-purple-800',
  };

  const statusOptions = ['new', 'reviewed', 'shortlisted', 'rejected', 'hired'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link
            to="/candidates"
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Applied on {new Date(candidate.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={candidate.status}
            onChange={(e) => handleStatusUpdate(e.target.value)}
            className={`text-sm font-medium px-3 py-2 rounded-md border-0 focus:ring-2 focus:ring-primary-500 ${
              statusColors[candidate.status as keyof typeof statusColors]
            }`}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
          <button
            onClick={handleDownloadResume}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Resume
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-500">{candidate.email}</p>
                  </div>
                </div>
                {candidate.phone && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone</p>
                      <p className="text-sm text-gray-500">{candidate.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Experience */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Work Experience
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Total Experience: <span className="font-medium">{candidate.experience.years} years</span>
                </p>
              </div>
              {candidate.experience.companies.length > 0 ? (
                <div className="space-y-4">
                  {candidate.experience.companies.map((company, index) => (
                    <div key={index} className="border-l-2 border-gray-200 pl-4">
                      <h4 className="text-sm font-medium text-gray-900">{company.position}</h4>
                      <p className="text-sm text-gray-600">{company.name}</p>
                      <p className="text-xs text-gray-500">{company.duration}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No specific work experience details extracted</p>
              )}
            </div>
          </div>

          {/* Education */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                Education
              </h3>
              {candidate.education.length > 0 ? (
                <div className="space-y-3">
                  {candidate.education.map((edu, index) => (
                    <div key={index} className="border-l-2 border-gray-200 pl-4">
                      <h4 className="text-sm font-medium text-gray-900">{edu.degree}</h4>
                      {edu.institution && (
                        <p className="text-sm text-gray-600">{edu.institution}</p>
                      )}
                      {edu.year && (
                        <p className="text-xs text-gray-500">{edu.year}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No education details extracted</p>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* ATS Score */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                ATS Score
              </h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600 mb-2">
                  {candidate.bestMatchScore}%
                </div>
                <div className={`w-full h-3 rounded-full mb-4 ${
                  candidate.bestMatchScore >= 80 ? 'bg-green-200' :
                  candidate.bestMatchScore >= 60 ? 'bg-yellow-200' : 'bg-red-200'
                }`}>
                  <div
                    className={`h-3 rounded-full ${
                      candidate.bestMatchScore >= 80 ? 'bg-green-500' :
                      candidate.bestMatchScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${candidate.bestMatchScore}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Best match: <span className="font-medium">{candidate.bestMatchJobRole?.title || 'No match'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Job Role Scores */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Job Role Matches</h3>
              <div className="space-y-3">
                {candidate.jobRoleScores
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5)
                  .map((roleScore, index) => (
                    <div key={roleScore.jobRole._id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-primary-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {roleScore.jobRole.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {roleScore.matchedSkills.length} skills matched
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {roleScore.score}%
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Resume File Info */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resume File</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Filename:</span> {candidate.resumeFileName}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Uploaded:</span> {new Date(candidate.createdAt).toLocaleString()}
                </p>
                <button
                  onClick={handleDownloadResume}
                  className="w-full mt-3 inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Original
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Matched Skills Detail */}
      {candidate.jobRoleScores.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Skill Matching Details</h3>
            <div className="space-y-4">
              {candidate.jobRoleScores
                .filter(roleScore => roleScore.matchedSkills.length > 0)
                .map((roleScore) => (
                  <div key={roleScore.jobRole._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-medium text-gray-900">
                        {roleScore.jobRole.title}
                      </h4>
                      <span className="text-sm font-medium text-primary-600">
                        {roleScore.score}% match
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roleScore.matchedSkills.map((matchedSkill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                        >
                          {matchedSkill.skill}
                          <span className="ml-1 text-green-600">
                            (×{matchedSkill.weight})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDetail;
