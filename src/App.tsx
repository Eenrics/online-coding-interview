import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CreateSession } from './pages/CreateSession';
import { InterviewRoom } from './pages/InterviewRoom';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateSession />} />
        <Route path="/session/:sessionId" element={<InterviewRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

