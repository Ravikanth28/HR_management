import React, { useState, useEffect } from 'react';
import { jobRolesAPI } from '../services/api';
import { JobRole, RequiredSkill } from '../types';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Eye,
  EyeOff,
  X,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';

const JobRoles: React.FC = () => {
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<JobRole | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requiredSkills: [{ skill: '', weight: 1 }] as RequiredSkill[],
    experienceLevel: 'mid' as 'entry' | 'mid' | 'senior' | 'lead',
    department: '',
    isActive: true
  });

  useEffect(() => {
    fetchJobRoles();
  }, []);

  const fetchJobRoles = async () => {
    try {
      setLoading(true);
      const data = await jobRolesAPI.getAll();
      setJobRoles(data.jobRoles);
    } catch (error) {
      console.error('Error fetching job roles:', error);
      toast.error('Failed to load job roles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role?: JobRole) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        title: role.title,
        description: role.description,
        requiredSkills: role.requiredSkills.length > 0 ? role.requiredSkills : [{ skill: '', weight: 1 }],
        experienceLevel: role.experienceLevel,
        department: role.department,
        isActive: role.isActive
      });
    } else {
      setEditingRole(null);
      setFormData({
        title: '',
        description: '',
        requiredSkills: [{ skill: '', weight: 1 }],
        experienceLevel: 'mid',
        department: '',
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSkillChange = (index: number, field: 'skill' | 'weight', value: string | number) => {
    const updatedSkills = [...formData.requiredSkills];
    updatedSkills[index] = {
      ...updatedSkills[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      requiredSkills: updatedSkills
    }));
  };

  const addSkill = () => {
    setFormData(prev => ({
      ...prev,
      requiredSkills: [...prev.requiredSkills, { skill: '', weight: 1 }]
    }));
  };

  const removeSkill = (index: number) => {
    if (formData.requiredSkills.length > 1) {
      setFormData(prev => ({
        ...prev,
        requiredSkills: prev.requiredSkills.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title || !formData.description || !formData.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    const validSkills = formData.requiredSkills.filter(skill => skill.skill.trim() !== '');
    if (validSkills.length === 0) {
      toast.error('Please add at least one skill');
      return;
    }

    try {
      const jobRoleData = {
        ...formData,
        requiredSkills: validSkills
      };

      if (editingRole) {
        await jobRolesAPI.update(editingRole._id, jobRoleData);
        toast.success('Job role updated successfully');
      } else {
        await jobRolesAPI.create(jobRoleData);
        toast.success('Job role created successfully');
      }

      handleCloseModal();
      fetchJobRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save job role');
    }
  };

  const handleToggleActive = async (roleId: string, isActive: boolean) => {
    try {
      await jobRolesAPI.update(roleId, { isActive });
      toast.success(`Job role ${isActive ? 'activated' : 'deactivated'}`);
      fetchJobRoles();
    } catch (error) {
      toast.error('Failed to update job role status');
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!window.confirm('Are you sure you want to delete this job role?')) {
      return;
    }

    try {
      await jobRolesAPI.delete(roleId);
      toast.success('Job role deleted successfully');
      fetchJobRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete job role');
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      await jobRolesAPI.initializeDefaults();
      toast.success('Default job roles initialized');
      fetchJobRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initialize defaults');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Roles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage job roles and their requirements for ATS scoring
          </p>
        </div>
        <div className="flex space-x-3">
          {jobRoles.length === 0 && (
            <button
              onClick={handleInitializeDefaults}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Initialize Defaults
            </button>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Job Role
          </button>
        </div>
      </div>

      {/* Job Roles Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {jobRoles.map((role) => (
          <div
            key={role._id}
            className={`bg-white overflow-hidden shadow rounded-lg ${
              !role.isActive ? 'opacity-60' : ''
            }`}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <h3 className="text-lg font-medium text-gray-900">{role.title}</h3>
                  {!role.isActive && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleToggleActive(role._id, !role.isActive)}
                    className="text-gray-400 hover:text-gray-600"
                    title={role.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {role.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleOpenModal(role)}
                    className="text-gray-400 hover:text-primary-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role._id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {role.description}
              </p>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span>{role.department}</span>
                <span className="capitalize">{role.experienceLevel}</span>
              </div>

              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Required Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {role.requiredSkills.slice(0, 3).map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800"
                    >
                      {skill.skill}
                      <span className="ml-1 text-primary-600">×{skill.weight}</span>
                    </span>
                  ))}
                  {role.requiredSkills.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{role.requiredSkills.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-1" />
                  {role.candidateCount || 0} candidates
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(role.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {jobRoles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No job roles found</p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Job Role
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingRole ? 'Edit Job Role' : 'Add New Job Role'}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department *</label>
                      <input
                        type="text"
                        required
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Experience Level</label>
                      <select
                        value={formData.experienceLevel}
                        onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="entry">Entry Level</option>
                        <option value="mid">Mid Level</option>
                        <option value="senior">Senior Level</option>
                        <option value="lead">Lead Level</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description *</label>
                      <textarea
                        required
                        rows={3}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Required Skills *</label>
                        <button
                          type="button"
                          onClick={addSkill}
                          className="text-sm text-primary-600 hover:text-primary-500"
                        >
                          + Add Skill
                        </button>
                      </div>
                      <div className="space-y-2">
                        {formData.requiredSkills.map((skill, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              placeholder="Skill name"
                              value={skill.skill}
                              onChange={(e) => handleSkillChange(index, 'skill', e.target.value)}
                              className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                            <input
                              type="number"
                              min="0.1"
                              max="5"
                              step="0.1"
                              placeholder="Weight"
                              value={skill.weight}
                              onChange={(e) => handleSkillChange(index, 'weight', parseFloat(e.target.value))}
                              className="w-20 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                            {formData.requiredSkills.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSkill(index)}
                                className="text-red-600 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                        Active
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingRole ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobRoles;
