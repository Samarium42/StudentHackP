import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleStartInterview = () => {
    const roomId = Math.random().toString(36).substring(7);
    navigate(`/interview/${roomId}`);

    fetch('/start-interview', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            console.log('Response from server:', data.message);
        })
        .catch(error => console.error('Failed to start interview:', error));
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
        <button
          onClick={handleStartInterview}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
        >
          Start New Interview
        </button>
      </div>
    </div>
  );
};

export default Home; 