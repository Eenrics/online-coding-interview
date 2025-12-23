import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { CodeEditor } from '../components/CodeEditor';
import { LanguageSelector } from '../components/LanguageSelector';
import { OutputConsole } from '../components/OutputConsole';
import { useWebSocket } from '../hooks/useWebSocket';
import { CodeExecutor } from '../services/codeExecutor';
import type { Language, CodeExecutionResult, User } from '../types';
import { DEFAULT_LANGUAGE } from '../utils/constants';

export const InterviewRoom: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get default code based on language
  const getDefaultCode = (lang: Language): string => {
    switch (lang) {
      case 'python':
        return '# Write your code here\nprint("Hello, World!")';
      case 'typescript':
        return '// Write your code here\nconsole.log("Hello, World!");';
      case 'javascript':
      default:
        return '// Write your code here\nconsole.log("Hello, World!");';
    }
  };

  const [language, setLanguage] = useState<Language>(
    (searchParams.get('language') as Language) || DEFAULT_LANGUAGE
  );
  const [code, setCode] = useState<string>(() => {
    const initialLang = (searchParams.get('language') as Language) || DEFAULT_LANGUAGE;
    return getDefaultCode(initialLang);
  });
  const [executionResult, setExecutionResult] = useState<CodeExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userId] = useState(() => {
    // Generate or retrieve user ID from sessionStorage
    const stored = sessionStorage.getItem('userId');
    if (stored) return stored;
    const newId = uuidv4();
    sessionStorage.setItem('userId', newId);
    return newId;
  });
  const [userName] = useState(() => {
    const stored = sessionStorage.getItem('userName');
    if (stored) return stored;
    const name = `User-${userId.slice(0, 8)}`;
    sessionStorage.setItem('userName', name);
    return name;
  });

  const codeExecutorRef = React.useRef<CodeExecutor | null>(null);
  const codeVersionRef = React.useRef(0);
  const isApplyingRemoteUpdateRef = React.useRef(false);
  const codeRef = React.useRef(code);

  // Keep code ref in sync
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Initialize code executor
  useEffect(() => {
    codeExecutorRef.current = new CodeExecutor();
    return () => {
      codeExecutorRef.current?.destroy();
    };
  }, []);

  // Memoize callbacks to prevent options object recreation
  const onCodeUpdateRef = useRef<(delta: unknown, version: number) => void>();
  const onCursorUpdateRef = useRef<(userId: string, position: { line: number; column: number }) => void>();
  const onUserJoinedRef = useRef<(user: User) => void>();
  const onUserLeftRef = useRef<(userId: string) => void>();
  const onLanguageChangedRef = useRef<(language: Language) => void>();
  const onPresenceUpdateRef = useRef<(users: User[]) => void>();
  const onErrorRef = useRef<(error: Error) => void>();

  // Update refs with latest callbacks
  onCodeUpdateRef.current = (delta, version) => {
    console.log('Code update received from WebSocket:', { delta, version });
    if (delta && typeof delta === 'object' && 'fullCode' in delta) {
      const newCode = (delta as { fullCode: string }).fullCode;
      console.log('Applying remote code update, length:', newCode.length);
      if (newCode !== codeRef.current) {
        isApplyingRemoteUpdateRef.current = true;
        setCode(newCode);
        codeVersionRef.current = version;
      }
    } else {
      console.warn('Invalid code update format:', delta);
    }
  };

  onCursorUpdateRef.current = (userId, position) => {
    console.log('Cursor update:', { userId, position });
  };

  onUserJoinedRef.current = (user) => {
    setUsers((prev) => {
      if (!Array.isArray(prev)) return [user];
      if (prev.find(u => u.id === user.id)) return prev;
      return [...prev, user];
    });
  };

  onUserLeftRef.current = (leftUserId) => {
    setUsers((prev) => {
      if (!Array.isArray(prev)) return [];
      return prev.filter(u => u.id !== leftUserId);
    });
  };

    onLanguageChangedRef.current = (newLanguage) => {
      setLanguage(newLanguage);
      // Update code to language-specific default if current code is the default
      const currentDefault = getDefaultCode(language);
      if (code === currentDefault || code.trim() === currentDefault.trim()) {
        setCode(getDefaultCode(newLanguage));
      }
    };

  onPresenceUpdateRef.current = (updatedUsers) => {
    setUsers(Array.isArray(updatedUsers) ? updatedUsers : []);
  };

  onErrorRef.current = (error) => {
    console.error('WebSocket error:', error);
  };

  // WebSocket connection - use stable options object
  const { isConnected, connectionError, sendCodeUpdate, sendLanguageChange } = useWebSocket({
    sessionId: sessionId || '',
    userId,
    userName,
    onCodeUpdate: (delta, version) => onCodeUpdateRef.current?.(delta, version),
    onCursorUpdate: (userId, position) => onCursorUpdateRef.current?.(userId, position),
    onUserJoined: (user) => onUserJoinedRef.current?.(user),
    onUserLeft: (userId) => onUserLeftRef.current?.(userId),
    onLanguageChanged: (language) => onLanguageChangedRef.current?.(language),
    onPresenceUpdate: (users) => onPresenceUpdateRef.current?.(users),
    onError: (error) => onErrorRef.current?.(error),
  });

  const lastSentCodeRef = React.useRef(code);
  const sendCodeUpdateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleCodeChange = useCallback((newCode: string) => {
    console.log('Code changed locally:', newCode.substring(0, 50));
    setCode(newCode);
    
    // Send code update via WebSocket (only if not applying a remote update)
    if (!isApplyingRemoteUpdateRef.current && isConnected && sendCodeUpdate) {
      // Throttle code updates - only send if code actually changed and after a short delay
      if (sendCodeUpdateTimeoutRef.current) {
        clearTimeout(sendCodeUpdateTimeoutRef.current);
      }
      
      sendCodeUpdateTimeoutRef.current = setTimeout(() => {
        if (newCode !== lastSentCodeRef.current) {
          codeVersionRef.current++;
          console.log('Sending code update via WebSocket, version:', codeVersionRef.current);
          // For simplicity, send the entire code as the delta
          // In production, you'd send actual operational transform deltas
          sendCodeUpdate({ fullCode: newCode }, codeVersionRef.current);
          lastSentCodeRef.current = newCode;
        }
      }, 100); // Wait 100ms before sending to batch rapid changes
    }
    
    isApplyingRemoteUpdateRef.current = false;
  }, [isConnected, sendCodeUpdate]);

  const handleLanguageChange = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    // Update code to language-specific default if current code is the default
    const currentDefault = getDefaultCode(language);
    if (code === currentDefault || code.trim() === currentDefault.trim()) {
      setCode(getDefaultCode(newLanguage));
    }
    sendLanguageChange(newLanguage);
  }, [sendLanguageChange, language, code]);

  const handleRunCode = useCallback(async () => {
    if (!codeExecutorRef.current) return;

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const result = await codeExecutorRef.current.execute(code, language);
      setExecutionResult(result);
    } catch (error) {
      setExecutionResult({
        output: '',
        error: error instanceof Error ? error.message : 'Execution failed',
        executionTime: 0,
      });
    } finally {
      setIsExecuting(false);
    }
  }, [code, language]);

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!');
    });
  }, []);

  if (!sessionId) {
    navigate('/');
    return null;
  }

  return (
    <div className="interview-room">
      <div className="interview-room-header">
        <div className="header-left">
          <h2>Interview Session</h2>
          <span className="session-id">Session: {sessionId.slice(0, 8)}...</span>
        </div>
        <div className="header-right">
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '● Connected' : '○ Disconnected'}
            </span>
            {connectionError && (
              <span className="connection-error">Connection error</span>
            )}
          </div>
          <div className="users-count">
            {users.length + 1} user{users.length !== 0 ? 's' : ''} online
          </div>
          <button onClick={handleCopyLink} className="copy-link-button">
            Copy Link
          </button>
        </div>
      </div>

      <div className="interview-room-toolbar">
        <LanguageSelector
          value={language}
          onChange={handleLanguageChange}
          disabled={!isConnected}
        />
        <button
          onClick={handleRunCode}
          disabled={isExecuting || !isConnected}
          className="run-code-button"
        >
          {isExecuting ? 'Running...' : '▶ Run Code'}
        </button>
      </div>

      <div className="interview-room-content">
        <div className="editor-panel">
          <CodeEditor
            value={code}
            language={language}
            onChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
            sessionId={sessionId}
            userId={userId}
            readOnly={!isConnected}
          />
        </div>
        <div className="output-panel">
          <OutputConsole result={executionResult} isExecuting={isExecuting} />
        </div>
      </div>
    </div>
  );
};

