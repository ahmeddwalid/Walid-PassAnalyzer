import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDictionaryService, useCustomDictionaries, useRefreshDictionaries } from '../contexts/AppContext';
import { Dictionary } from '../services/interfaces';

interface DictionaryManagerProps {
  onDictionariesChange?: () => void;
}

interface UploadState {
  isUploading: boolean;
  error: string | null;
  success: string | null;
}

const DictionaryManager: React.FC<DictionaryManagerProps> = ({ onDictionariesChange }) => {
  const dictionaryService = useDictionaryService();
  const dictionaries = useCustomDictionaries();
  const refreshDictionaries = useRefreshDictionaries();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    error: null,
    success: null
  });

  const clearMessages = useCallback(() => {
    setUploadState(prev => ({ ...prev, error: null, success: null }));
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadState({ isUploading: true, error: null, success: null });

    try {
      // Validate file type
      if (!file.name.endsWith('.json') && !file.name.endsWith('.txt')) {
        throw new Error('Only JSON and TXT files are supported');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      const dictionary = await dictionaryService.loadDictionary(file);
      dictionaryService.addDictionary(dictionary);
      
      refreshDictionaries();
      onDictionariesChange?.();
      
      setUploadState({
        isUploading: false,
        error: null,
        success: `Dictionary "${dictionary.name}" loaded successfully with ${dictionary.words.length} words`
      });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: null }));
      }, 5000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dictionary';
      setUploadState({
        isUploading: false,
        error: errorMessage,
        success: null
      });
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [dictionaryService, refreshDictionaries, onDictionariesChange]);

  const handleToggleDictionary = useCallback((id: string, enabled: boolean) => {
    dictionaryService.toggleDictionary(id, enabled);
    refreshDictionaries();
    onDictionariesChange?.();
  }, [dictionaryService, refreshDictionaries, onDictionariesChange]);

  const handleRemoveDictionary = useCallback((id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove the dictionary "${name}"?`)) {
      dictionaryService.removeDictionary(id);
      refreshDictionaries();
      onDictionariesChange?.();
      
      setUploadState(prev => ({
        ...prev,
        success: `Dictionary "${name}" removed successfully`,
        error: null
      }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: null }));
      }, 3000);
    }
  }, [dictionaryService, refreshDictionaries, onDictionariesChange]);

  const handleUploadClick = useCallback(() => {
    clearMessages();
    fileInputRef.current?.click();
  }, [clearMessages]);

  const userDictionaries = dictionaries.filter(d => d.source === 'user');
  const builtinDictionaries = dictionaries.filter(d => d.source === 'builtin');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Dictionary Management</h3>
        <p className="text-gray-400">
          Upload custom dictionaries to enhance password analysis with organization-specific terms
        </p>
      </div>

      {/* Upload Section */}
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <h4 className="text-lg font-medium text-white mb-4">Upload Custom Dictionary</h4>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-300 space-y-2">
            <p><strong>Supported formats:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>JSON array: <code className="text-xs bg-gray-700 px-1 rounded">["word1", "word2", "word3"]</code></li>
              <li>JSON object: <code className="text-xs bg-gray-700 px-1 rounded">{"{"}"name": "My Dict", "words": ["word1", "word2"]{"}"}</code></li>
              <li>Text file: One word per line</li>
            </ul>
            <p className="text-xs text-gray-500">Maximum file size: 10MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={handleUploadClick}
            disabled={uploadState.isUploading}
            className={`
              w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 border-2 border-dashed
              ${uploadState.isUploading
                ? 'bg-gray-600 border-gray-600 cursor-not-allowed opacity-50'
                : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
              }
            `}
          >
            {uploadState.isUploading ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processing...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <span>📁</span>
                <span>Choose Dictionary File</span>
              </span>
            )}
          </button>
        </div>

        {/* Upload Messages */}
        {uploadState.error && (
          <div className="mt-4 p-3 bg-red-900/40 border border-red-700/60 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="text-red-400 text-sm">❌</span>
              <div>
                <h5 className="text-sm font-medium text-red-300">Upload Failed</h5>
                <p className="text-sm text-red-200 mt-1">{uploadState.error}</p>
              </div>
            </div>
          </div>
        )}

        {uploadState.success && (
          <div className="mt-4 p-3 bg-green-900/40 border border-green-700/60 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="text-green-400 text-sm">✅</span>
              <div>
                <h5 className="text-sm font-medium text-green-300">Upload Successful</h5>
                <p className="text-sm text-green-200 mt-1">{uploadState.success}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Dictionaries */}
      {userDictionaries.length > 0 && (
        <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-lg font-medium text-white mb-4">Custom Dictionaries</h4>
          
          <div className="space-y-3">
            {userDictionaries.map((dictionary) => (
              <div
                key={dictionary.id}
                className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-600/50"
              >
                <div className="flex items-center space-x-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dictionary.enabled}
                      onChange={(e) => handleToggleDictionary(dictionary.id, e.target.checked)}
                      className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500 focus:ring-2"
                    />
                  </label>
                  
                  <div>
                    <h5 className={`font-medium ${dictionary.enabled ? 'text-white' : 'text-gray-400'}`}>
                      {dictionary.name}
                    </h5>
                    <p className="text-sm text-gray-500">
                      {dictionary.words.length.toLocaleString()} words
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    dictionary.enabled 
                      ? 'bg-green-900/40 text-green-300 border border-green-700/60'
                      : 'bg-gray-700/40 text-gray-400 border border-gray-600/60'
                  }`}>
                    {dictionary.enabled ? 'Active' : 'Disabled'}
                  </span>
                  
                  <button
                    onClick={() => handleRemoveDictionary(dictionary.id, dictionary.name)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200"
                    title="Remove dictionary"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Built-in Dictionaries */}
      {builtinDictionaries.length > 0 && (
        <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-lg font-medium text-white mb-4">Built-in Word Lists</h4>
          <p className="text-sm text-gray-400 mb-4">
            These are standard word lists used for passphrase generation and password analysis.
          </p>
          
          <div className="space-y-3">
            {builtinDictionaries.map((dictionary) => (
              <div
                key={dictionary.id}
                className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-600/50"
              >
                <div className="flex items-center space-x-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dictionary.enabled}
                      onChange={(e) => handleToggleDictionary(dictionary.id, e.target.checked)}
                      className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500 focus:ring-2"
                    />
                  </label>
                  
                  <div>
                    <h5 className={`font-medium ${dictionary.enabled ? 'text-white' : 'text-gray-400'}`}>
                      {dictionary.name}
                    </h5>
                    <p className="text-sm text-gray-500">
                      {dictionary.words.length.toLocaleString()} words • Built-in
                    </p>
                  </div>
                </div>

                <span className={`px-2 py-1 text-xs rounded-full ${
                  dictionary.enabled 
                    ? 'bg-blue-900/40 text-blue-300 border border-blue-700/60'
                    : 'bg-gray-700/40 text-gray-400 border border-gray-600/60'
                }`}>
                  {dictionary.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {userDictionaries.length === 0 && builtinDictionaries.length === 0 && (
        <div className="text-center p-8 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="text-4xl mb-4 text-gray-500">📚</div>
          <p className="text-gray-400">
            No dictionaries loaded. Upload a custom dictionary to get started.
          </p>
        </div>
      )}
    </div>
  );
};

export default DictionaryManager;