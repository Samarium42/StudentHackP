import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InterviewRoom from './components/InterviewRoom';
import Home from './components/Home';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/interview/:roomId" element={<InterviewRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 