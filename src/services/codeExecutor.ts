import type { CodeExecutionResult, Language } from '../types';

/**
 * Service for executing code safely in Web Workers
 */
export class CodeExecutor {
  private worker: Worker | null = null;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      // Create worker from inline code as blob URL
      // This approach works across different build systems
      const workerCode = `
self.onmessage = function(event) {
  const { type, code, language } = event.data;
  
  if (type === 'execute') {
    const startTime = performance.now();
    let output = '';
    let error;
    
    try {
      if (language === 'python') {
        // Python simulation - check for restricted operations
        if (code.includes('import os') || code.includes('import sys') || code.includes('__import__')) {
          output = 'Error: Restricted imports are not allowed in sandboxed environment';
          error = 'Restricted imports are not allowed';
        } else {
          output = '[Python Simulation]\\nCode execution simulated.\\nNote: Full Python execution requires Pyodide or server-side execution.';
        }
      } else if (language === 'javascript' || language === 'typescript') {
        const logs = [];
        const originalLog = console.log;
        console.log = function(...args) {
          logs.push(args.map(function(a) {
            if (typeof a === 'object') {
              try {
                return JSON.stringify(a, null, 2);
              } catch (e) {
                return String(a);
              }
            }
            return String(a);
          }).join(' '));
        };
        
        try {
          new Function('"use strict"; ' + code)();
          output = logs.join('\\n') || 'No output';
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
        } finally {
          console.log = originalLog;
        }
      } else {
        error = 'Unsupported language: ' + language;
      }
      
      const executionTime = performance.now() - startTime;
      self.postMessage(JSON.stringify({
        type: error ? 'error' : 'result',
        output: output || undefined,
        error: error,
        executionTime: Math.round(executionTime * 100) / 100,
      }));
    } catch (e) {
      self.postMessage(JSON.stringify({
        type: 'error',
        error: e instanceof Error ? e.message : String(e),
        executionTime: 0,
      }));
    }
  }
};
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
    } catch (error) {
      console.error('Failed to initialize code executor worker:', error);
    }
  }

  async execute(code: string, language: Language): Promise<CodeExecutionResult> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        this.initializeWorker();
        if (!this.worker) {
          reject(new Error('Worker initialization failed'));
          return;
        }
      }

      const timeout = setTimeout(() => {
        reject(new Error('Code execution timeout'));
      }, 10000); // 10 second timeout

      const messageHandler = (event: MessageEvent) => {
        clearTimeout(timeout);
        this.worker?.removeEventListener('message', messageHandler);

        try {
          const result: CodeExecutionResult = JSON.parse(event.data);
          resolve(result);
        } catch (error) {
          reject(new Error('Failed to parse execution result'));
        }
      };

      this.worker.addEventListener('message', messageHandler);
      this.worker.postMessage({ type: 'execute', code, language });
    });
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

