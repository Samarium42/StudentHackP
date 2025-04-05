import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const InterviewRoom: React.FC = () => {
  const { roomId } = useParams();
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [code, setCode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Initialize video stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => console.error('Error accessing media devices:', err));
  }, []);

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
      </div>
      
      <div className="flex-1 flex">
        {/* Video and Chat Section */}
        <div className="w-1/3 flex flex-col p-4">
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
                className="flex-1 border rounded-l-lg p-2"
                placeholder="Type a message..."
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

        {/* Code Editor Section */}
        <div className="flex-1 p-4">
          <div className="bg-white rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Code Editor</h2>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm border rounded-lg"
                placeholder="Write your code here..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom; 