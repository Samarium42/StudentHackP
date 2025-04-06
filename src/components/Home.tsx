import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CVUpload from './CVUpload';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [cvUploaded, setCvUploaded] = useState(false);
  const [cvFilename, setCvFilename] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const handleStartInterview = () => {
    if (!cvUploaded || !jobDescription.trim()) {
      return;
    }
    const roomId = Math.random().toString(36).substring(7);
    navigate(`/interview/${roomId}`);
  };

  const handleCvUploadSuccess = (filename: string) => {
    setCvFilename(filename);
    setCvUploaded(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Live Interview Platform
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Conduct seamless technical interviews with real-time coding, video chat, and collaboration.
        </p>
        
        {!cvUploaded ? (
          <CVUpload onUploadSuccess={handleCvUploadSuccess} jobDescription={jobDescription} />
        ) : (
          <div className="space-y-4">
            <div className="text-green-600 text-center">
              ✓ CV uploaded successfully: {cvFilename}
            </div>
            <div className="space-y-2">
              <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700">
                Job Description
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Enter the job description here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={4}
              />
            </div>
            <button
              onClick={handleStartInterview}
              disabled={!jobDescription.trim()}
              className={`w-full py-3 px-4 rounded-lg transition duration-300 ${
                !jobDescription.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Start New Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home; 