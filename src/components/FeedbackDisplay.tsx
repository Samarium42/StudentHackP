import React from 'react';
import { TextAnalysis, AudioAnalysis } from '../types/analysis';

interface Feedback {
  type: 'positive' | 'negative' | 'neutral' | 'improvement';
  message: string;
}

interface Metrics {
  word_count: number;
  avg_word_length: number;
  filler_words: number;
  professional_terms: number;
  positive_indicators: number;
  negative_indicators: number;
  sentiment_polarity: number;
  sentiment_subjectivity: number;
}

interface AudioMetrics {
  volume_stats: {
    mean: number;
    std: number;
    max: number;
    min: number;
  };
  speaking_pace: number;
  clarity_score: number;
  zero_crossing_rate: number;
}

interface FeedbackDisplayProps {
  textAnalysis?: TextAnalysis;
  audioAnalysis?: AudioAnalysis;
  overallScore?: number;
  isLoading?: boolean;
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  textAnalysis,
  audioAnalysis,
  overallScore,
  isLoading
}) => {
  const getFeedbackColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'improvement':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-md animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      {overallScore !== undefined && (
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold mb-2">Overall Performance</h3>
          <div className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
            {overallScore.toFixed(1)}%
          </div>
        </div>
      )}

      {textAnalysis && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Response Analysis</h3>
          <div className={`text-xl font-semibold ${getScoreColor(textAnalysis.quality_score)} mb-2`}>
            Score: {textAnalysis.quality_score.toFixed(1)}%
          </div>
          <div className="space-y-2">
            {textAnalysis.feedback.map((item, index) => (
              <div key={index} className={`${getFeedbackColor(item.type)} text-sm`}>
                • {item.message}
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-gray-600">
            <div>Words: {textAnalysis.metrics.word_count}</div>
            <div>Professional terms: {textAnalysis.metrics.professional_terms}</div>
            <div>Filler words: {textAnalysis.metrics.filler_words}</div>
          </div>
        </div>
      )}

      {audioAnalysis && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Voice Analysis</h3>
          <div className={`text-xl font-semibold ${getScoreColor(audioAnalysis.audio_quality_score)} mb-2`}>
            Score: {audioAnalysis.audio_quality_score.toFixed(1)}%
          </div>
          <div className="space-y-2">
            {audioAnalysis.feedback.map((item, index) => (
              <div key={index} className={`${getFeedbackColor(item.type)} text-sm`}>
                • {item.message}
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-gray-600">
            <div>Speaking pace: {audioAnalysis.metrics.speaking_pace.toFixed(1)} WPM</div>
            <div>Clarity: {(audioAnalysis.metrics.clarity_score * 100).toFixed(1)}%</div>
            <div>Volume consistency: {(100 - audioAnalysis.metrics.volume_stats.std * 100).toFixed(1)}%</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackDisplay; 