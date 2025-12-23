export const SUPPORTED_LANGUAGES: Array<{ value: string; label: string; monacoLang: string }> = [
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { value: 'typescript', label: 'TypeScript', monacoLang: 'typescript' },
  { value: 'python', label: 'Python', monacoLang: 'python' },
];

export const DEFAULT_LANGUAGE = 'javascript';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export const RECONNECTION_ATTEMPTS = 5;
export const RECONNECTION_DELAY = 1000;

