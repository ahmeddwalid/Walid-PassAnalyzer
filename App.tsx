
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PasswordInput } from './components/PasswordInput';
import { StrengthMeter } from './components/StrengthMeter';
import { FeedbackDisplay } from './components/FeedbackDisplay';
import { TabNavigation, TabType } from './components/TabNavigation';
import { PasswordGenerator } from './components/PasswordGenerator';
import { PasswordComparison } from './components/PasswordComparison';
import DictionaryManager from './components/DictionaryManager';
import { EnhancedAnalysisResult } from './types';
import { ExclamationTriangleIcon, ShieldCheckIcon } from './components/IconComponents';
import { AppProvider, usePasswordAnalysisService, useCustomDictionaries } from './contexts/AppContext';
import { ExportButton } from './components/ExportButton';
import { createAnalysisData } from './services/ExportUtils';
import { useDebounce } from './hooks/useDebounce';

const AppContent: React.FC = () => {
  const passwordAnalysisService = usePasswordAnalysisService();
  const customDictionaries = useCustomDictionaries();
  
  const [activeTab, setActiveTab] = useState<TabType>('analyzer');
  const [password, setPassword] = useState<string>('');
  const [strengthResult, setStrengthResult] = useState<EnhancedAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Debounce password analysis to improve performance during typing
  const debouncedPassword = useDebounce(password, 300); // 300ms delay

  const handlePasswordChange = useCallback((newPassword: string) => {
    setPassword(newPassword);
    
    // Clear result immediately if password is empty
    if (!newPassword.trim()) {
      setStrengthResult(null);
      setIsAnalyzing(false);
      // Explicitly clear password if only spaces were entered and trimmed to empty
      if (password !== '' && newPassword.trim() === '') {
        setPassword('');
      }
    } else {
      // Show analyzing state for non-empty passwords
      setIsAnalyzing(true);
    }
  }, [password]);

  // Perform analysis when debounced password changes
  useEffect(() => {
    if (debouncedPassword.trim()) {
      try {
        const result = passwordAnalysisService.analyzePassword(debouncedPassword, customDictionaries);
        setStrengthResult(result);
      } catch (error) {
        console.error('Password analysis failed:', error);
        setStrengthResult(null);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setStrengthResult(null);
      setIsAnalyzing(false);
    }
  }, [debouncedPassword, passwordAnalysisService, customDictionaries]);

  const clearPassword = useCallback(() => {
    setPassword('');
    setStrengthResult(null);
  }, []);

  const characterCount = useMemo(() => password.length, [password]);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased">
      <div className={`w-full ${activeTab === 'generator' ? 'max-w-7xl' : 'max-w-2xl'} bg-gray-800 shadow-2xl rounded-xl p-6 sm:p-8 lg:p-10 ring-1 ring-gray-700`}>
        <header className="mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-purple-500 to-pink-500">
            Walid PassAnalyzer
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Elevate your password security. Instantly analyze strength & get expert tips.
          </p>
        </header>

        <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

        <main>
          {activeTab === 'analyzer' && (
            <>
              <section className="mb-2">
                <PasswordInput 
                  password={password} 
                  onPasswordChange={handlePasswordChange}
                  onClear={clearPassword}
                  characterCount={characterCount}
                />
                <div className="flex justify-end items-center mt-1.5 pr-1">
                  <span className={`text-xs ${characterCount > 0 ? 'text-gray-400' : 'text-gray-500'}`}>
                    Length: {characterCount}
                  </span>
                </div>
              </section>

              {isAnalyzing ? (
                <div className="mt-8 p-6 bg-gray-850/50 rounded-lg text-center border border-gray-700/70">
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-sky-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-gray-400 text-base">Analyzing password strength...</p>
                  </div>
                </div>
              ) : strengthResult && password ? (
                <>
                  <section className="my-6">
                     <StrengthMeter score={strengthResult.score} />
                  </section>
                  
                  <section>
                    <FeedbackDisplay result={strengthResult} />
                  </section>

                  <section className="mt-6 pt-6 border-t border-gray-700/50">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                      <h3 className="text-sm font-medium text-gray-300 sm:mr-4">Export Analysis Report:</h3>
                      <div className="flex gap-3">
                        <ExportButton 
                          data={createAnalysisData(password, strengthResult)}
                          format="pdf"
                          className="text-sm"
                        />
                        <ExportButton 
                          data={createAnalysisData(password, strengthResult)}
                          format="text"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                 <div className="mt-8 p-6 bg-gray-850/50 rounded-lg text-center border border-gray-700/70">
                   <p className="text-gray-400 text-base">
                     Enter a password above to reveal its strength and receive improvement suggestions.
                   </p>
                 </div>
              )}
            </>
          )}

          {activeTab === 'generator' && <PasswordGenerator />}

          {activeTab === 'comparison' && <PasswordComparison />}

          {activeTab === 'dictionaries' && <DictionaryManager />}
        </main>

        <footer className="mt-10 pt-8 border-t border-gray-700/50 text-center space-y-4">
          <div className="p-4 bg-yellow-900/40 border border-yellow-700/60 rounded-lg text-sm text-yellow-200 flex items-center justify-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <span>This tool is for educational purposes. <strong>Do not enter real sensitive passwords online.</strong></span>
          </div>
          <div className="p-4 bg-sky-900/40 border border-sky-700/60 rounded-lg text-sm text-sky-200 flex items-center justify-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-sky-400 flex-shrink-0" />
            <span><strong>Privacy Assurance:</strong> We do not collect or store any passwords you enter. All analysis is done locally in your browser.</span>
          </div>
          <p className="text-sm text-gray-500 pt-2">
            Password strength analysis powered by the <a href="https://github.com/dropbox/zxcvbn" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 hover:underline">zxcvbn</a> library.
          </p>
           <p className="text-xs text-gray-600 mt-2">
            Made by Ahmed Walid.
          </p>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;