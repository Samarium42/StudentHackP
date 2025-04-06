import React from 'react';

interface AudioAnalysisProps {
  audioAnalysis: {
    duration?: number;
    snr?: number;
    volume_consistency?: number;
    clarity_score?: number;
    feedback?: string[];
    audio_quality_score?: number;
    metrics?: {
      duration?: number;
      snr?: number;
      volume_consistency?: number;
      clarity_score?: number;
    };
  };
  transcriptAnalysis: {
    word_count?: number;
    reading_time?: number;
    sentiment?: number;
    subjectivity?: number;
    feedback?: string[];
    quality_score?: number;
    metrics?: {
      word_count?: number;
      reading_time?: number;
      sentiment?: number;
      subjectivity?: number;
    };
  };
}

const AudioAnalysisFeedback: React.FC<AudioAnalysisProps> = ({ 
  audioAnalysis, 
  transcriptAnalysis 
}) => {
  // Get metrics from either direct properties or metrics object
  const duration = audioAnalysis.duration || audioAnalysis.metrics?.duration;
  const clarityScore = audioAnalysis.clarity_score || audioAnalysis.metrics?.clarity_score;
  const wordCount = transcriptAnalysis.word_count || transcriptAnalysis.metrics?.word_count;
  const readingTime = transcriptAnalysis.reading_time || transcriptAnalysis.metrics?.reading_time;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">Audio Analysis Feedback</h3>
      
      {/* Audio Quality Section */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-2">Audio Quality</h4>
        <div className="space-y-2">
          {audioAnalysis.feedback?.map((feedback, index) => (
            <div key={index} className="flex items-start">
              <span className="text-green-500 mr-2">•</span>
              <p className="text-gray-600">{feedback}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transcript Analysis Section */}
      <div>
        <h4 className="font-medium text-gray-700 mb-2">Content Analysis</h4>
        <div className="space-y-2">
          {transcriptAnalysis.feedback?.map((feedback, index) => (
            <div key={index} className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <p className="text-gray-600">{feedback}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Display */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-500">Duration</p>
          <p className="font-medium">{duration?.toFixed(1)}s</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-500">Word Count</p>
          <p className="font-medium">{wordCount}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-500">Reading Time</p>
          <p className="font-medium">{readingTime?.toFixed(1)} min</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-500">Clarity Score</p>
          <p className="font-medium">{(clarityScore || 0 * 100).toFixed(0)}%</p>
        </div>
      </div>
    </div>
  );
};

export default AudioAnalysisFeedback; 