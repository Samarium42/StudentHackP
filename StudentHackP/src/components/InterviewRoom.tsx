import React, { useState } from 'react';
import AudioAnalysisFeedback from './AudioAnalysisFeedback';

interface Feedback {
  type: 'positive' | 'negative' | 'neutral' | 'improvement';
  message: string;
}

interface Message {
  sender: string;
  text?: string;
  component?: React.ReactNode;
}

interface AnalysisResult {
  success: boolean;
  text_analysis?: {
    quality_score: number;
    metrics: any;
    feedback: Feedback[];
  };
  audio_analysis?: {
    audio_quality_score: number;
    metrics: any;
    feedback: Feedback[];
  };
  overall_score?: number;
}

const InterviewRoom: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const analyzeResponse = async (audioBlob: Blob, text: string) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      // Send to speech analysis endpoint
      const analysisResponse = await fetch('http://localhost:5000/api/analyze-speech', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
        mode: 'cors'
      }).catch(error => {
        console.error('Network error:', error);
        throw new Error('Could not connect to the analysis server. Please make sure the server is running on http://localhost:5000');
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze speech');
      }

      const analysisData = await analysisResponse.json();
      
      if (analysisData.success) {
        const results = analysisData.results;
        
        // Add the new audio analysis feedback component
        if (results.audio_analysis && results.text_analysis) {
          setMessages(prev => [...prev, {
            sender: 'Analysis',
            component: (
              <AudioAnalysisFeedback 
                audioAnalysis={results.audio_analysis}
                transcriptAnalysis={results.text_analysis}
              />
            )
          }]);
        }

        // Keep existing feedback handling
        const feedback: Feedback[] = [];
        // ... rest of the existing feedback code ...

        setAnalysisResult({
          success: true,
          text_analysis: {
            quality_score: results.text_analysis?.quality_score,
            metrics: results.text_analysis?.metrics,
            feedback: feedback
          },
          audio_analysis: results.audio_analysis ? {
            audio_quality_score: results.audio_analysis.audio_quality_score,
            metrics: results.audio_analysis.metrics,
            feedback: results.audio_analysis.feedback as Feedback[]
          } : undefined,
          overall_score: results.overall_score
        });

        // Add analysis feedback to messages
        if (feedback.length > 0) {
          setMessages(prev => [...prev, {
            sender: 'Analysis',
            text: feedback.map(f => f.message).join('\n')
          }]);
        }
      } else {
        throw new Error(analysisData.error || 'Failed to analyze speech');
      }
    } catch (error) {
      console.error('Error analyzing response:', error);
      setMessages(prev => [...prev, {
        sender: 'System',
        text: error instanceof Error ? error.message : 'Failed to analyze response. Please try again.'
      }]);
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${
            message.sender === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-3 ${
              message.sender === 'user'
                ? 'bg-blue-500 text-white'
                : message.sender === 'Analysis'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            {message.component || message.text}
          </div>
        </div>
      ))}
    </div>
  );
};

export default InterviewRoom; 