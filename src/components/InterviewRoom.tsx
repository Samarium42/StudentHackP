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
    const [status, setStatus] = useState<string>('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        fetchRecordings();
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            recordings.forEach(recording => URL.revokeObjectURL(recording.url));
        };
    }, []);

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
            setStatus('Error fetching recordings');
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            mediaRecorderRef.current = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                chunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
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
                    setStatus('Recording uploaded successfully');
                    fetchRecordings();
                } catch (error) {
                    console.error('Error uploading recording:', error);
                    setStatus('Error uploading recording');
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setStatus('Recording started');
        } catch (error) {
            console.error('Error starting recording:', error);
            setStatus('Error starting recording');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setStatus('Recording stopped');
        }
    };

    const runTTS = async () => {
        try {
            setTtsStatus('Running TTS...');
            const response = await fetch('http://localhost:3001/runtts');
            const data = await response.json();
            
            if (data.success) {
                setTtsStatus('TTS completed successfully');
            } else {
                setTtsStatus(`TTS failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Error running TTS:', error);
            setTtsStatus('Error running TTS');
        }
    };

    return (
        <div className="interview-room">
            <div className="controls">
                <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={isRecording ? 'recording' : ''}
                >
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                <button onClick={runTTS}>Run TTS</button>
            </div>

            {status && <div className="status">{status}</div>}
            {ttsStatus && <div className="tts-status">{ttsStatus}</div>}

            <div className="recordings-list">
                <h3>Recordings</h3>
                {recordings.map((recording) => (
                    <div key={recording.id} className="recording-item">
                        <audio controls src={recording.url} />
                        <span className="timestamp">
                            {new Date(recording.timestamp).toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>

            <style>{`
                .interview-room {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }

                .controls {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                button {
                    padding: 10px 20px;
                    font-size: 16px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    background-color: #007bff;
                    color: white;
                    transition: background-color 0.3s;
                }

                button:hover {
                    background-color: #0056b3;
                }

                button.recording {
                    background-color: #dc3545;
                }

                button.recording:hover {
                    background-color: #c82333;
                }

                .status, .tts-status {
                    margin: 10px 0;
                    padding: 10px;
                    border-radius: 5px;
                    background-color: #f8f9fa;
                }

                .recordings-list {
                    margin-top: 20px;
                }

                .recording-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 10px 0;
                    padding: 10px;
                    background-color: #f8f9fa;
                    border-radius: 5px;
                }

                .timestamp {
                    color: #6c757d;
                    font-size: 14px;
                }

                audio {
                    flex: 1;
                }
            `}</style>
        </div>
    );
};

export default InterviewRoom; 