import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type { Language } from '../types';
import { DEFAULT_LANGUAGE, API_BASE_URL } from '../utils/constants';

export const CreateSession: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreateSession = async () => {
    setIsCreating(true);
    setError(null);

    try {
      // Generate session ID
      const sessionId = uuidv4();

      // In Phase 1, we'll simulate session creation
      // In Phase 3, this will call the actual API
      const response = await fetch(`${API_BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: DEFAULT_LANGUAGE,
        }),
      });

      if (!response.ok) {
        // If backend is not available, proceed with client-side session
        console.warn('Backend not available, using client-side session');
        navigate(`/session/${sessionId}?language=${DEFAULT_LANGUAGE}`);
        return;
      }

      const data = await response.json();
      navigate(`/session/${data.id}`);
    } catch (err) {
      // Fallback to client-side session if backend is unavailable
      console.warn('Failed to create session on server, using client-side session:', err);
      const sessionId = uuidv4();
      navigate(`/session/${sessionId}?language=${DEFAULT_LANGUAGE}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="create-session-page">
      <div className="create-session-container">
        <h1>Online Coding Interview Platform</h1>
        <p className="subtitle">Create a new interview session to get started</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button
          onClick={handleCreateSession}
          disabled={isCreating}
          className="create-session-button"
        >
          {isCreating ? 'Creating Session...' : 'Create New Session'}
        </button>

        <div className="features-list">
          <h3>Features:</h3>
          <ul>
            <li>Real-time collaborative code editing</li>
            <li>Multiple programming language support</li>
            <li>Safe in-browser code execution</li>
            <li>Live updates for all participants</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

