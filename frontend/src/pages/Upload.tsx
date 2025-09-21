import React, { useState, useCallback } from 'react';
import { uploadAPI } from '../services/api';
import { BulkUploadResponse } from '../types';
import { Upload as UploadIcon, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Upload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResponse | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter(file => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        return ['pdf', 'doc', 'docx'].includes(extension || '');
      });

      if (validFiles.length !== droppedFiles.length) {
        toast.error('Some files were ignored. Only PDF, DOC, and DOCX files are allowed.');
      }

      setFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    try {
      setUploading(true);
      setUploadResult(null);

      if (files.length === 1) {
        // Single file upload
        const result = await uploadAPI.uploadResume(files[0]);
        toast.success('Resume uploaded successfully!');
        setUploadResult({
          message: 'Single resume uploaded successfully',
          summary: {
            total: 1,
            successful: 1,
            failed: 0
          },
          results: {
            successful: [{
              filename: files[0].name,
              candidateId: result.candidate.id,
              name: result.candidate.name,
              email: result.candidate.email,
              bestMatchScore: result.candidate.bestMatchScore
            }],
            failed: []
          }
        });
      } else {
        // Bulk upload
        const result = await uploadAPI.bulkUploadResumes(files);
        setUploadResult(result);
        
        if (result.summary.successful > 0) {
          toast.success(`${result.summary.successful} resumes uploaded successfully!`);
        }
        if (result.summary.failed > 0) {
          toast.error(`${result.summary.failed} resumes failed to upload`);
        }
      }

      setFiles([]);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Resumes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload single or multiple resumes for automatic processing and ATS scoring
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 ${
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Drop files here or click to browse
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  PDF, DOC, DOCX up to 10MB each
                </p>
              </div>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Selected Files ({files.length})
              </h3>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="mt-6">
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                `Upload ${files.length} ${files.length === 1 ? 'Resume' : 'Resumes'}`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Upload Results */}
      {uploadResult && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Upload Results
            </h3>
            
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {uploadResult.summary.total}
                </div>
                <div className="text-sm text-blue-800">Total Files</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {uploadResult.summary.successful}
                </div>
                <div className="text-sm text-green-800">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {uploadResult.summary.failed}
                </div>
                <div className="text-sm text-red-800">Failed</div>
              </div>
            </div>

            {/* Successful Uploads */}
            {uploadResult.results.successful.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Successfully Processed ({uploadResult.results.successful.length})
                </h4>
                <div className="space-y-2">
                  {uploadResult.results.successful.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-md"
                    >
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          {result.filename}
                        </p>
                        <p className="text-xs text-green-700">
                          {result.name} ({result.email}) - ATS Score: {result.bestMatchScore}%
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Uploads */}
            {uploadResult.results.failed.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-3 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Failed to Process ({uploadResult.results.failed.length})
                </h4>
                <div className="space-y-2">
                  {uploadResult.results.failed.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-md"
                    >
                      <div>
                        <p className="text-sm font-medium text-red-900">
                          {result.filename}
                        </p>
                        <p className="text-xs text-red-700">
                          {result.error}
                        </p>
                      </div>
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          Upload Instructions
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Supported formats: PDF, DOC, DOCX</li>
          <li>• Maximum file size: 10MB per file</li>
          <li>• You can upload multiple files at once</li>
          <li>• Resumes will be automatically parsed and scored against job roles</li>
          <li>• Duplicate candidates (same email) will be rejected</li>
        </ul>
      </div>
    </div>
  );
};

export default Upload;
