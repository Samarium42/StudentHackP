import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import OpenAI from 'openai';

const InterviewRoom: React.FC = () => {
  const { roomId } = useParams();
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  
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

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `recordings/interview-${timestamp}.webm`;
          
          // Save the audio file
          const link = document.createElement('a');
          link.href = URL.createObjectURL(audioBlob);
          link.download = fileName;
          link.click();

          // Transcribe the audio
          try {
            const transcription = await transcribeAudio(audioBlob);
            setTranscription(transcription);
            setMessages(prev => [...prev, { 
              sender: 'Transcription', 
              text: transcription 
            }]);
          } catch (error) {
            console.error('Error transcribing audio:', error);
            setMessages(prev => [...prev, { 
              sender: 'Error', 
              text: 'Failed to transcribe audio' 
            }]);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      })
      .catch(err => console.error('Error starting recording:', err));
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    if (!openaiRef.current) {
      throw new Error('OpenAI client not initialized');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    const data = await response.json();
    return data.text;
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

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, { sender: 'You', text: newMessage }]);
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
        <div className="w-full flex flex-col p-4">
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
                <div key={index} className="mb-2">
                  <span className="font-bold">{message.sender}: </span>
                  <span>{message.text}</span>
                </div>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 border rounded-l-lg p-2"
                placeholder="Type a message or press Enter to start/stop recording..."
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-500 text-white px-4 py-2 rounded-r-lg"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom; 