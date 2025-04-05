import React, { useEffect, useRef, useState, useCallback } from 'react';

interface SpeechMetrics {
  wordsPerMinute: number;
  fillerWords: number;
  confidence: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  clarity: number;
  pauses: number;
}

interface AnalysisFeedback {
  message: string;
  type: 'positive' | 'warning' | 'improvement';
  priority: 'high' | 'medium' | 'low';
}

interface HistoricalMetrics {
  timestamp: number;
  metrics: SpeechMetrics;
  transcript: string;
}

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'so', 'basically', 'actually', 'well', 'kind of', 'sort of'];
const POSITIVE_WORDS = ['good', 'great', 'excellent', 'wonderful', 'amazing', 'perfect', 'fantastic', 'brilliant'];
const NEGATIVE_WORDS = ['bad', 'terrible', 'awful', 'poor', 'disappointing', 'difficult', 'challenging', 'problem'];

const SpeechAnalyzer: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [metrics, setMetrics] = useState<SpeechMetrics>({
    wordsPerMinute: 0,
    fillerWords: 0,
    confidence: 0,
    sentiment: 'neutral',
    clarity: 0,
    pauses: 0
  });
  const [feedback, setFeedback] = useState<AnalysisFeedback[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalMetrics[]>([]);
  const [transcript, setTranscript] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wordCountRef = useRef(0);
  const lastWordTimeRef = useRef<number | null>(null);
  const pauseCountRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const generateFeedback = useCallback((metrics: SpeechMetrics) => {
    const newFeedback: AnalysisFeedback[] = [];
    
    // Pace feedback
    if (metrics.wordsPerMinute < 100) {
      newFeedback.push({
        message: "Try speaking a bit faster to maintain engagement",
        type: "improvement",
        priority: "medium"
      });
    } else if (metrics.wordsPerMinute > 200) {
      newFeedback.push({
        message: "Consider slowing down for better clarity",
        type: "warning",
        priority: "medium"
      });
    } else {
      newFeedback.push({
        message: "Good speaking pace",
        type: "positive",
        priority: "low"
      });
    }
    
    // Filler words feedback
    if (metrics.fillerWords > 5) {
      newFeedback.push({
        message: "Try to reduce filler words for more professional communication",
        type: "improvement",
        priority: "high"
      });
    }
    
    // Pause feedback
    if (metrics.pauses > 3) {
      newFeedback.push({
        message: "Try to maintain a more consistent flow with fewer long pauses",
        type: "improvement",
        priority: "medium"
      });
    }
    
    // Clarity feedback
    if (metrics.clarity < 60) {
      newFeedback.push({
        message: "Focus on clear and concise communication",
        type: "improvement",
        priority: "high"
      });
    }
    
    // Sort feedback by priority
    newFeedback.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    setFeedback(newFeedback);
  }, []);

  const analyzeTranscript = useCallback((text: string, currentTime: number) => {
    const words = text.toLowerCase().split(/\s+/);
    
    // Calculate filler words
    const fillerCount = words.filter(word => FILLER_WORDS.includes(word)).length;
    
    // Calculate sentiment
    let sentimentScore = 0;
    words.forEach(word => {
      if (POSITIVE_WORDS.includes(word)) sentimentScore++;
      if (NEGATIVE_WORDS.includes(word)) sentimentScore--;
    });
    const sentiment: 'positive' | 'negative' | 'neutral' = 
      sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral';
    
    // Calculate words per minute
    const elapsedMinutes = startTime ? (currentTime - startTime) / 60000 : 0;
    const wordsPerMinute = elapsedMinutes > 0 ? wordCountRef.current / elapsedMinutes : 0;
    
    // Calculate clarity (based on word confidence and pauses)
    const clarity = Math.max(0, 100 - (fillerCount * 5) - (pauseCountRef.current * 3));
    
    const newMetrics: SpeechMetrics = {
      wordsPerMinute,
      fillerWords: fillerCount,
      confidence: 0, // This would come from speech recognition confidence
      sentiment,
      clarity,
      pauses: pauseCountRef.current
    };
    
    setMetrics(newMetrics);
    
    // Store historical data
    setHistoricalData(prev => [...prev, {
      timestamp: currentTime,
      metrics: newMetrics,
      transcript: text
    }]);
    
    // Generate feedback
    generateFeedback(newMetrics);
  }, [startTime, generateFeedback]);

  const startRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop speech recognition:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsProcessing(true);
        console.log('Speech recognition started');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const currentTime = Date.now();
        const results = event.results;
        const transcript = Array.from(results)
          .map((result) => result[0].transcript)
          .join('');

        // Update transcript
        setTranscript(transcript);

        // Count words and calculate metrics
        const words = transcript.toLowerCase().split(/\s+/);
        wordCountRef.current = words.length;

        // Check for pauses
        if (lastWordTimeRef.current && currentTime - lastWordTimeRef.current > 2000) {
          pauseCountRef.current++;
        }
        lastWordTimeRef.current = currentTime;

        // Analyze the transcript
        analyzeTranscript(transcript, currentTime);
      };

      recognition.onerror = (event: SpeechRecognitionError) => {
        console.error('Speech recognition error:', event.error);
        setIsProcessing(false);
        
        // Restart recognition if it was interrupted
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          setTimeout(() => {
            if (isRecording) {
              startRecognition();
            }
          }, 1000);
        }
      };

      recognition.onend = () => {
        setIsProcessing(false);
        console.log('Speech recognition ended');
        
        // Restart recognition if still recording
        if (isRecording) {
          setTimeout(() => {
            startRecognition();
          }, 1000);
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.error('Speech recognition not supported in this browser');
    }

    return () => {
      stopRecognition();
    };
  }, [analyzeTranscript, isRecording, startRecognition, stopRecognition]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');

        try {
          const response = await fetch('http://localhost:5000/api/analyze-audio', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();
          if (result.success) {
            setMetrics(result.metrics);
            setTranscript(result.metrics.transcript);
            generateFeedback(result.metrics);
          } else {
            console.error('Audio analysis failed:', result.error);
          }
        } catch (error) {
          console.error('Error sending audio to backend:', error);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, []);

  const startAnalysis = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Error starting analysis:', error);
      setIsRecording(false);
    }
  };

  const stopAnalysis = () => {
    stopRecording();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Interview Speech Analysis</h2>
      
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Status</h3>
            <p className="text-gray-600">
              {isRecording ? (isProcessing ? 'Processing...' : 'Recording') : 'Ready'}
            </p>
          </div>
          <button
            onClick={isRecording ? stopAnalysis : startAnalysis}
            className={`px-6 py-2 rounded-lg font-medium ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white transition-colors`}
            disabled={isProcessing}
          >
            {isRecording ? 'Stop Analysis' : 'Start Analysis'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Current Metrics</h3>
            <div className="space-y-2">
              <p>Words per Minute: {metrics.wordsPerMinute.toFixed(1)}</p>
              <p>Filler Words: {metrics.fillerWords}</p>
              <p>Pauses: {metrics.pauses}</p>
              <p>Clarity: {metrics.clarity.toFixed(1)}%</p>
              <p>Sentiment: {metrics.sentiment}</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Live Transcript</h3>
            <div className="h-48 overflow-y-auto bg-white p-3 rounded border">
              {transcript || 'Start speaking to see transcript...'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">Feedback</h3>
        <div className="space-y-2">
          {feedback.map((item, index) => (
            <div
              key={index}
              className={`p-3 rounded ${
                item.type === 'positive'
                  ? 'bg-green-50 text-green-700'
                  : item.type === 'warning'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              <p className="font-medium">{item.message}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">Historical Data</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">WPM</th>
                <th className="px-4 py-2 text-left">Filler Words</th>
                <th className="px-4 py-2 text-left">Pauses</th>
                <th className="px-4 py-2 text-left">Clarity</th>
                <th className="px-4 py-2 text-left">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {historicalData.slice(-5).map((data, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(data.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2">{data.metrics.wordsPerMinute.toFixed(1)}</td>
                  <td className="px-4 py-2">{data.metrics.fillerWords}</td>
                  <td className="px-4 py-2">{data.metrics.pauses}</td>
                  <td className="px-4 py-2">{data.metrics.clarity.toFixed(1)}%</td>
                  <td className="px-4 py-2">{data.metrics.sentiment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SpeechAnalyzer; 