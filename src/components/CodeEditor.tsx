import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../utils/constants';

interface CodeEditorProps {
  value: string;
  language: Language;
  onChange: (value: string) => void;
  onLanguageChange: (language: Language) => void;
  sessionId: string;
  userId: string;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  language,
  onChange,
  onLanguageChange,
  sessionId,
  userId,
  readOnly = false,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const isUpdatingFromPropRef = useRef(false);

  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof import('monaco-editor')
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const model = editor.getModel();
    if (!model) return;

    // Set initial value
    if (value) {
      model.setValue(value);
    }

    // Listen to editor changes
    model.onDidChangeContent(() => {
      if (!isUpdatingFromPropRef.current) {
        const currentValue = model.getValue();
        onChange(currentValue);
      }
    });

    // Configure editor
    editor.updateOptions({
      readOnly,
      minimap: { enabled: true },
      fontSize: 14,
      tabSize: 2,
      wordWrap: 'on',
    });
  };

  // Update editor when value prop changes (from remote updates)
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== value) {
        isUpdatingFromPropRef.current = true;
        model.setValue(value);
        // Reset flag after a short delay to allow the change to propagate
        setTimeout(() => {
          isUpdatingFromPropRef.current = false;
        }, 0);
      }
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const langConfig = SUPPORTED_LANGUAGES.find(l => l.value === language);
        monacoRef.current.editor.setModelLanguage(model, langConfig?.monacoLang || 'javascript');
      }
    }
  }, [language]);

  return (
    <div className="code-editor-container">
      <Editor
        height="100%"
        language={SUPPORTED_LANGUAGES.find(l => l.value === language)?.monacoLang || 'javascript'}
        value={value}
        onChange={(newValue) => {
          // This is a fallback - main handling is in onDidChangeContent
          if (newValue !== undefined && !isUpdatingFromPropRef.current) {
            onChange(newValue);
          }
        }}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          tabSize: 2,
          wordWrap: 'on',
          automaticLayout: true,
        }}
        theme="vs-dark"
      />
    </div>
  );
};

