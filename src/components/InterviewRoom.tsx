import React, { useEffect, useRef, useState } from 'react';

interface Recording {
    id: string;
    url: string;
    timestamp: Date;
    filename: string;
}

const InterviewRoom: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [ttsStatus, setTtsStatus] = useState<string>('');
    const [printStatus, setPrintStatus] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Separate useEffect for video initialization
    useEffect(() => {
        // Initialize video stream
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch(err => console.error('Error accessing media devices:', err));

        return () => {
            // Cleanup video stream
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []); // Empty dependency array - only run once on mount

    // Separate useEffect for recordings
    useEffect(() => {
        // Load existing recordings
        fetchRecordings();

        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            // Cleanup recording URLs
            recordings.forEach(recording => URL.revokeObjectURL(recording.url));
        };
    }, []); // Empty dependency array - only run once on mount

    const fetchRecordings = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/recordings');
            if (!response.ok) {
                throw new Error('Failed to fetch recordings');
            }
            const data = await response.json();
            setRecordings(data);
        } catch (error) {
            console.error('Error fetching recordings:', error);
        }
    };

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
                    const timestamp = new Date();
                    const filename = `interview-${timestamp.toISOString().replace(/[:.]/g, '-')}.webm`;
                    
                    const formData = new FormData();
                    formData.append('audio', audioBlob, filename);

                    try {
                        const response = await fetch('http://localhost:3001/api/upload', {
                            method: 'POST',
                            body: formData
                        });

                        if (!response.ok) {
                            throw new Error('Failed to upload recording');
                        }

                        const data = await response.json();
                        
                        const recording: Recording = {
                            id: data.filename.replace('.webm', ''),
                            url: URL.createObjectURL(audioBlob),
                            timestamp: new Date(),
                            filename: data.filename
                        };

                        setRecordings(prev => [...prev, recording]);
                    } catch (error) {
                        console.error('Error saving recording:', error);
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

    const downloadRecording = (recording: Recording) => {
        const link = document.createElement('a');
        link.href = recording.url;
        link.download = recording.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const printAString = async () => {
        try {
            console.log('Starting fetch request to /api/print-string');
            const response = await fetch('http://localhost:3001/api/print-string');
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Received data:', data);
            setPrintStatus(data.message);
        } catch (error) {
            console.error('Error printing string:', error);
            setPrintStatus(`Error: ${error instanceof Error ? error.message : 'Failed to fetch string'}`);
        }
    };

    const runTTS = async () => {
        try {
            console.log('Starting fetch request to /api/runtts');
            const response = await fetch('http://localhost:3001/api/runtts');
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Received data:', data);
            setTtsStatus(data.success ? 'TTS script executed successfully' : 'Failed to execute TTS script');
        } catch (error) {
            console.error('Error running TTS:', error);
            setTtsStatus(`Error: ${error instanceof Error ? error.message : 'Failed to run TTS script'}`);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4">
                    <h1 className="text-3xl font-bold text-gray-900">Interview Room</h1>
                </div>
            </header>
            
            <div className="flex-1 flex">
                {/* Left side - Video */}
                <div className="w-1/2 p-4">
                    <div className="bg-white rounded-lg shadow-lg p-4 h-full">
                        <h2 className="text-xl font-semibold mb-4">Video Feed</h2>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-[calc(100%-3rem)] object-cover rounded-lg"
                        />
                    </div>
                </div>

                {/* Right side - Controls and Recordings */}
                <div className="w-1/2 p-4">
                    <div className="bg-white rounded-lg shadow-lg p-4 h-full flex flex-col">
                        <h2 className="text-xl font-semibold mb-4">Controls</h2>
                        
                        {/* Recording Controls */}
                        <div className="mb-4">
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`px-4 py-2 rounded transition-colors ${
                                    isRecording
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                            >
                                {isRecording ? 'Stop Recording' : 'Start Recording'}
                            </button>
                        </div>

                        <div className="mb-4">
                            <button
                                onClick={runTTS}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Run TTS Script
                            </button>
                            {ttsStatus && (
                                <p className="mt-2 text-sm text-gray-600">{ttsStatus}</p>
                            )}
                        </div>
                        <div className="mb-4">
                          <button
                            onClick={printAString}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                          >
                            Print a String
                          </button>
                          {printStatus && (
                              <p className="mt-2 text-sm text-gray-600">{printStatus}</p>
                          )}
                        </div>

                        {/* Recordings List */}
                        <div className="flex-1 overflow-y-auto">
                            <h3 className="text-lg font-semibold mb-2">Recordings</h3>
                            <div className="space-y-2">
                                {recordings.map((recording, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <span>Recording {index + 1}</span>
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
        </div>
    );
};

export default InterviewRoom; 