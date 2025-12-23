/**
 * Web Worker for safe code execution
 * This worker runs in an isolated context to prevent security issues
 */

// Worker message types
interface WorkerMessage {
  type: 'execute';
  code: string;
  language: string;
}

interface WorkerResponse {
  type: 'result' | 'error';
  output?: string;
  error?: string;
  executionTime: number;
}

// Simulated Python execution (since we can't run Python in browser)
function executePython(code: string): string {
  // This is a simulation - in production, you might use Pyodide or similar
  try {
    // Basic syntax validation
    if (code.includes('import os') || code.includes('import sys')) {
      return 'Error: Restricted imports are not allowed in sandboxed environment';
    }
    
    // Simple simulation - just echo the code
    return `[Python Simulation]\nCode would execute here.\nNote: This is a simulated execution.`;
  } catch (error) {
    return `Error: ${error}`;
  }
}

// Execute JavaScript/TypeScript code
function executeJavaScript(code: string): string {
  const startTime = performance.now();
  let output = '';
  let error: string | undefined;

  try {
    // Capture console.log output
    const originalLog = console.log;
    const logs: string[] = [];
    
    console.log = (...args: unknown[]) => {
      logs.push(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    // Execute in a restricted context
    // Using Function constructor to create isolated scope
    const func = new Function(`
      "use strict";
      ${code}
    `);

    func();

    output = logs.join('\n');
    console.log = originalLog;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const executionTime = performance.now() - startTime;

  return JSON.stringify({
    type: error ? 'error' : 'result',
    output: output || (error ? undefined : 'No output'),
    error,
    executionTime: Math.round(executionTime * 100) / 100,
  } as WorkerResponse);
}

// Main worker message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, code, language } = event.data;

  if (type === 'execute') {
    let result: string;

    try {
      switch (language) {
        case 'python':
          result = executePython(code);
          break;
        case 'javascript':
        case 'typescript':
          result = executeJavaScript(code);
          break;
        default:
          result = JSON.stringify({
            type: 'error',
            error: `Unsupported language: ${language}`,
            executionTime: 0,
          } as WorkerResponse);
      }

      self.postMessage(result);
    } catch (error) {
      self.postMessage(JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0,
      } as WorkerResponse));
    }
  }
};

