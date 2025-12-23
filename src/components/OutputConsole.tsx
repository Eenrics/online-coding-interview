import React from 'react';
import type { CodeExecutionResult } from '../types';

interface OutputConsoleProps {
  result: CodeExecutionResult | null;
  isExecuting: boolean;
}

export const OutputConsole: React.FC<OutputConsoleProps> = ({ result, isExecuting }) => {
  return (
    <div className="output-console">
      <div className="output-console-header">
        <span>Output</span>
        {isExecuting && <span className="executing-indicator">Executing...</span>}
        {result && (
          <span className="execution-time">
            {result.executionTime}ms
          </span>
        )}
      </div>
      <div className="output-console-content">
        {isExecuting ? (
          <div className="output-loading">Running code...</div>
        ) : result ? (
          <div className={`output-result ${result.error ? 'output-error' : 'output-success'}`}>
            {result.error ? (
              <div>
                <div className="error-label">Error:</div>
                <pre>{result.error}</pre>
              </div>
            ) : (
              <pre>{result.output || 'No output'}</pre>
            )}
          </div>
        ) : (
          <div className="output-placeholder">Output will appear here after code execution</div>
        )}
      </div>
    </div>
  );
};

