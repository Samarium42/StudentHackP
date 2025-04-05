import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import OpenAI from 'openai';
import FeedbackDisplay from './FeedbackDisplay';
import { AnalysisResult, Feedback } from '../types/analysis';

interface Recording {
  id: string;
  url: string;
  timestamp: Date;
  filename: string;
}

const InterviewRoom: React.FC = () => {
  const { roomId } = useParams();
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [textAnalysisDebounce, setTextAnalysisDebounce] = useState<NodeJS.Timeout | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const openaiRef = useRef<OpenAI | null>(null);

  useEffect(() => {
    // Initialize OpenAI client
    openaiRef.current = new OpenAI({ 
      apiKey: process.env.REACT_APP_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true 
    });

    // Initialize video stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => console.error('Error accessing media devices:', err));

    // Load existing recordings
    fetchRecordings();

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      // Cleanup recording URLs
      recordings.forEach(recording => URL.revokeObjectURL(recording.url));
    };
  }, []);

  const fetchRecordings = async () => {
    // No need to fetch from server anymore since we're handling recordings in memory
    return;
  };

  const analyzeTextOnly = async (text: string) => {
    if (!text.trim()) {
      setAnalysisResult(null);
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/analyze-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('Text analysis failed');
      }

      const result = await response.json();
      if (result.success) {
        setAnalysisResult({
          success: true,
          text_analysis: {
            quality_score: result.quality_score,
            metrics: result.metrics,
            feedback: result.feedback as Feedback[]
          },
          overall_score: result.quality_score
        });
      }
    } catch (error) {
      console.error('Error analyzing text:', error);
      setAnalysisResult(null);
    }
  };

  const analyzeResponse = async (audioFile: File, text: string) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('text', text);

      const response = await fetch('http://localhost:5001/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      // Transform the response to match our types
      const analysisResult: AnalysisResult = {
        success: true,
        text_analysis: result.text_analysis ? {
          quality_score: result.text_analysis.quality_score,
          metrics: result.text_analysis.metrics,
          feedback: result.text_analysis.feedback as Feedback[]
        } : undefined,
        audio_analysis: result.audio_analysis ? {
          audio_quality_score: result.audio_analysis.audio_quality_score,
          metrics: result.audio_analysis.metrics,
          feedback: result.audio_analysis.feedback as Feedback[]
        } : undefined,
        overall_score: result.overall_score
      };

      setAnalysisResult(analysisResult);

      // Add analysis feedback to messages
      const feedbacks: string[] = [];
      if (analysisResult.text_analysis?.feedback) {
        feedbacks.push(...analysisResult.text_analysis.feedback.map(f => f.message));
      }
      if (analysisResult.audio_analysis?.feedback) {
        feedbacks.push(...analysisResult.audio_analysis.feedback.map(f => f.message));
      }
      
      if (feedbacks.length > 0) {
        setMessages(prev => [...prev, {
          sender: 'Analysis',
          text: feedbacks.join('\n')
        }]);
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

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const timestamp = new Date();
            const filename = `interview-${timestamp.toISOString().replace(/[:.]/g, '-')}.webm`;
            
            // Create a new recording object
            const recording: Recording = {
              id: filename.replace('.webm', ''),
              url: URL.createObjectURL(audioBlob),
              timestamp: new Date(),
              filename: filename
            };

            // Add to recordings list
            setRecordings(prev => [...prev, recording]);

            // Create a new File object from the Blob
            const audioFile = new File([audioBlob], filename, { type: 'audio/webm' });

            // Create FormData and append the file
            const formData = new FormData();
            formData.append('audio', audioFile);
            formData.append('text', newMessage);

            // Analyze the response
            await analyzeResponse(audioFile, newMessage);
          } catch (error) {
            console.error('Error processing recording:', error);
            setMessages(prev => [...prev, { 
              sender: 'Error', 
              text: 'Failed to process recording' 
            }]);
          } finally {
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      })
      .catch(err => {
        console.error('Error starting recording:', err);
        setMessages(prev => [...prev, { 
          sender: 'Error', 
          text: 'Failed to start recording. Please make sure you have granted microphone permissions.' 
        }]);
      });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadRecording = (recording: Recording) => {
    const link = document.createElement('a');
    link.href = recording.url;
    link.download = recording.filename;
    link.click();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setNewMessage(text);
    
    if (!text.trim()) {
      setAnalysisResult(null);
      if (textAnalysisDebounce) {
        clearTimeout(textAnalysisDebounce);
      }
      return;
    }
    
    // Debounce text analysis to avoid too many requests
    if (textAnalysisDebounce) {
      clearTimeout(textAnalysisDebounce);
    }
    
    setTextAnalysisDebounce(
      setTimeout(() => {
        analyzeTextOnly(text);
      }, 500)
    );
  };

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      setMessages([...messages, { sender: 'You', text: newMessage }]);
      
      // Analyze the text when sending
      try {
        const result = await fetch('http://localhost:5001/api/analyze-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: newMessage })
        }).then(res => res.json());

        if (result.success) {
          setAnalysisResult({
            success: true,
            text_analysis: result,
            overall_score: result.quality_score
          });
        }
      } catch (error) {
        console.error('Error analyzing message:', error);
      }
      
      setNewMessage('');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold">Interview Room: {roomId}</h1>
        <div className="flex items-center mt-2">
          <div className="mr-4 flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm">{isRecording ? 'Recording' : 'Press Enter to Start Recording'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex">
        <div className="w-2/3 flex flex-col p-4">
          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
            />
          </div>
          
          <div className="flex-1 bg-white rounded-lg shadow p-4 flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4">
              {messages.map((message, index) => (
                <div key={index} className={`mb-2 ${message.sender === 'Analysis' ? 'text-blue-600' : ''}`}>
                  <span className="font-bold">{message.sender}: </span>
                  <span>{message.text}</span>
                </div>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                value={newMessage}
                onChange={handleMessageChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                className="flex-1 border rounded-lg px-4 py-2 mr-2"
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="w-1/3 p-4">
          <FeedbackDisplay
            textAnalysis={analysisResult?.text_analysis}
            audioAnalysis={analysisResult?.audio_analysis}
            overallScore={analysisResult?.overall_score}
            isLoading={isAnalyzing}
          />
          
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Recordings</h3>
            <div className="space-y-2">
              {recordings.map(recording => (
                <div key={recording.id} className="flex items-center justify-between bg-white p-2 rounded-lg shadow">
                  <span className="text-sm text-gray-600">
                    {recording.timestamp.toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => downloadRecording(recording)}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom; 