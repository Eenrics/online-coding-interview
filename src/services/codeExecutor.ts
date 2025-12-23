import type { CodeExecutionResult, Language } from "../types";

/**
 * Service for executing code safely in Web Workers using WASM
 * - JavaScript/TypeScript: Executed in isolated Web Worker
 * - Python: Executed using Pyodide (Python compiled to WASM)
 *
 * Security: All code execution happens in isolated Web Workers,
 * preventing access to the main thread and DOM.
 */
export class CodeExecutor {
  private worker: Worker | null = null;
  private pyodideWorker: Worker | null = null;
  private isPyodideReady = false;
  private pyodideLoadPromise: Promise<void> | null = null;

  constructor() {
    this.initializeWorker();
    this.initializePyodideWorker();
  }

  private initializeWorker(): void {
    try {
      // Create worker for JavaScript/TypeScript execution
      const workerCode = `
self.onmessage = async function(event) {
  const { type, code, language } = event.data;
  
  if (type === 'execute') {
    const startTime = performance.now();
    let output = '';
    let error;
    
    try {
      if (language === 'javascript' || language === 'typescript') {
        // Capture console output
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.log = function(...args) {
          logs.push({ type: 'log', message: formatArgs(args) });
        };
        
        console.error = function(...args) {
          logs.push({ type: 'error', message: formatArgs(args) });
        };
        
        console.warn = function(...args) {
          logs.push({ type: 'warn', message: formatArgs(args) });
        };
        
        function formatArgs(args) {
          return args.map(function(a) {
            if (typeof a === 'object') {
              try {
                return JSON.stringify(a, null, 2);
              } catch (e) {
                return String(a);
              }
            }
            return String(a);
          }).join(' ');
        }
        
        try {
          // Execute in strict mode for better security
          const strictCode = '"use strict";\\n' + code;
          
          // Create a sandboxed execution context
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const fn = new AsyncFunction(strictCode);
          
          // Execute with timeout protection
          const result = await Promise.race([
            fn(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Execution timeout')), 10000)
            )
          ]);
          
          // Format output
          if (logs.length > 0) {
            output = logs.map(log => {
              if (log.type === 'error') return \`Error: \${log.message}\`;
              if (log.type === 'warn') return \`Warning: \${log.message}\`;
              return log.message;
            }).join('\\n');
          } else if (result !== undefined) {
            output = String(result);
          } else {
            output = 'No output';
          }
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          // Include any console errors in output
          if (logs.length > 0) {
            const errorLogs = logs.filter(log => log.type === 'error');
            if (errorLogs.length > 0) {
              output = errorLogs.map(log => log.message).join('\\n');
            }
          }
        } finally {
          // Restore original console methods
          console.log = originalLog;
          console.error = originalError;
          console.warn = originalWarn;
        }
      } else {
        error = 'Unsupported language for this worker: ' + language;
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

      const blob = new Blob([workerCode], { type: "application/javascript" });
      this.worker = new Worker(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Failed to initialize code executor worker:", error);
    }
  }

  private initializePyodideWorker(): void {
    try {
      // Create a separate worker for Python execution using Pyodide
      // Note: Pyodide needs to be loaded from CDN, which requires proper CORS setup
      const pyodideWorkerCode = `
// Load Pyodide from CDN
let pyodide = null;
let isReady = false;
let isLoading = false;

async function loadPyodideInstance() {
  if (isReady || isLoading) return;
  isLoading = true;
  
  try {
    // Import Pyodide script
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js');
    
    // Wait for pyodide to be available globally
    if (typeof self.loadPyodide === 'function') {
      pyodide = await self.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
      });
      
      // Set up stdout/stderr capture
      pyodide.runPython(\`
import sys
from io import StringIO

class OutputCapture:
    def __init__(self):
        self.buffer = StringIO()
    
    def write(self, s):
        if s:
            self.buffer.write(str(s))
    
    def flush(self):
        pass
    
    def getvalue(self):
        return self.buffer.getvalue()

stdout_capture = OutputCapture()
stderr_capture = OutputCapture()
sys.stdout = stdout_capture
sys.stderr = stderr_capture
\`);
      
      isReady = true;
      isLoading = false;
      self.postMessage(JSON.stringify({ type: 'ready' }));
    } else {
      throw new Error('Pyodide loadPyodide function not found');
    }
  } catch (error) {
    isLoading = false;
    self.postMessage(JSON.stringify({
      type: 'error',
      error: 'Failed to load Pyodide: ' + (error.message || String(error))
    }));
  }
}

// Start loading Pyodide
loadPyodideInstance();

self.onmessage = async function(event) {
  const { type, code, language } = event.data;
  
  if (type === 'execute') {
    if (language !== 'python') {
      self.postMessage(JSON.stringify({
        type: 'error',
        error: 'This worker only supports Python',
        executionTime: 0,
      }));
      return;
    }
    
    // Wait for Pyodide to be ready
    if (!isReady || !pyodide) {
      // Try to load again
      await loadPyodideInstance();
      
      if (!isReady || !pyodide) {
        self.postMessage(JSON.stringify({
          type: 'error',
          error: 'Pyodide is not ready yet. Please wait...',
          executionTime: 0,
        }));
        return;
      }
    }
    
    const startTime = performance.now();
    let output = '';
    let error;
    
    try {
      // Reset output buffers
      pyodide.runPython(\`
stdout_capture.buffer = StringIO()
stderr_capture.buffer = StringIO()
\`);
      
      // Execute Python code with timeout
      const executePromise = pyodide.runPythonAsync(code);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), 10000)
      );
      
      await Promise.race([executePromise, timeoutPromise]);
      
      // Get captured output
      const stdout = pyodide.runPython('stdout_capture.getvalue()');
      const stderr = pyodide.runPython('stderr_capture.getvalue()');
      
      if (stderr) {
        error = stderr;
      } else {
        output = stdout || 'No output';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      // Try to get stderr if available
      try {
        const stderr = pyodide.runPython('stderr_capture.getvalue()');
        if (stderr) {
          error = stderr;
        }
      } catch (err) {
        // Ignore
      }
    }
    
    const executionTime = performance.now() - startTime;
    self.postMessage(JSON.stringify({
      type: error ? 'error' : 'result',
      output: output || undefined,
      error: error,
      executionTime: Math.round(executionTime * 100) / 100,
    }));
  }
};
      `;

      const blob = new Blob([pyodideWorkerCode], {
        type: "application/javascript",
      });
      this.pyodideWorker = new Worker(URL.createObjectURL(blob));

      // Wait for Pyodide to be ready
      this.pyodideLoadPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Pyodide loading timeout"));
        }, 60000); // 60 second timeout for initial load

        this.pyodideWorker?.addEventListener("message", (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "ready") {
              clearTimeout(timeout);
              this.isPyodideReady = true;
              resolve(undefined);
            } else if (message.type === "error") {
              clearTimeout(timeout);
              reject(new Error(message.error));
            }
          } catch (e) {
            // Ignore parse errors
          }
        });
      });
    } catch (error) {
      console.error("Failed to initialize Pyodide worker:", error);
      this.pyodideLoadPromise = Promise.reject(error);
    }
  }

  async execute(
    code: string,
    language: Language
  ): Promise<CodeExecutionResult> {
    // Use Pyodide worker for Python
    if (language === "python") {
      return this.executePython(code);
    }

    // Use regular worker for JavaScript/TypeScript
    // Note: TypeScript will be executed as JavaScript (TS is a superset of JS)
    // For full TypeScript support, consider adding a transpiler
    return this.executeJavaScript(code, language);
  }

  private async executeJavaScript(
    code: string,
    language: Language
  ): Promise<CodeExecutionResult> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        this.initializeWorker();
        if (!this.worker) {
          reject(new Error("Worker initialization failed"));
          return;
        }
      }

      const timeout = setTimeout(() => {
        reject(new Error("Code execution timeout"));
      }, 12000); // 12 second timeout

      const messageHandler = (event: MessageEvent) => {
        clearTimeout(timeout);
        this.worker?.removeEventListener("message", messageHandler);

        try {
          const result: CodeExecutionResult = JSON.parse(event.data);
          resolve(result);
        } catch (error) {
          reject(new Error("Failed to parse execution result"));
        }
      };

      this.worker.addEventListener("message", messageHandler);
      this.worker.postMessage({ type: "execute", code, language });
    });
  }

  private async executePython(code: string): Promise<CodeExecutionResult> {
    // Wait for Pyodide to be ready
    if (!this.isPyodideReady && this.pyodideLoadPromise) {
      try {
        await this.pyodideLoadPromise;
      } catch (error) {
        return {
          output: "",
          error:
            "Python runtime (Pyodide) failed to load. Please refresh the page and try again.",
          executionTime: 0,
        };
      }
    }

    if (!this.isPyodideReady) {
      return {
        output: "",
        error:
          "Python runtime (Pyodide) is still loading. Please wait a moment and try again.",
        executionTime: 0,
      };
    }

    return new Promise((resolve, reject) => {
      if (!this.pyodideWorker) {
        this.initializePyodideWorker();
        if (!this.pyodideWorker) {
          reject(new Error("Pyodide worker initialization failed"));
          return;
        }
      }

      const timeout = setTimeout(() => {
        reject(new Error("Code execution timeout"));
      }, 12000); // 12 second timeout

      const messageHandler = (event: MessageEvent) => {
        clearTimeout(timeout);
        this.pyodideWorker?.removeEventListener("message", messageHandler);

        try {
          const result: CodeExecutionResult = JSON.parse(event.data);
          resolve(result);
        } catch (error) {
          reject(new Error("Failed to parse execution result"));
        }
      };

      this.pyodideWorker.addEventListener("message", messageHandler);
      this.pyodideWorker.postMessage({
        type: "execute",
        code,
        language: "python",
      });
    });
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.pyodideWorker) {
      this.pyodideWorker.terminate();
      this.pyodideWorker = null;
    }
    this.isPyodideReady = false;
    this.pyodideLoadPromise = null;
  }
}
