
import React, { useState, useCallback, useMemo } from 'react';
import zxcvbn from 'zxcvbn';
import { PasswordInput } from './components/PasswordInput';
import { StrengthMeter } from './components/StrengthMeter';
import { FeedbackDisplay } from './components/FeedbackDisplay';
import { ZxcvbnResult } from './types';
import { ExclamationTriangleIcon, ShieldCheckIcon } from './components/IconComponents'; // Import new ShieldCheckIcon

const App: React.FC = () => {
  const [password, setPassword] = useState<string>('');
  const [strengthResult, setStrengthResult] = useState<ZxcvbnResult | null>(null);

  const handlePasswordChange = useCallback((newPassword: string) => {
    setPassword(newPassword);
    if (newPassword.trim()) {
      // Debouncing or web worker consideration is still valid for production
      const result = zxcvbn(newPassword);
      setStrengthResult(result as ZxcvbnResult); 
    } else {
      setStrengthResult(null);
      // Explicitly clear password if only spaces were entered and trimmed to empty
      if (password !== '' && newPassword.trim() === '') {
        setPassword('');
      }
    }
  }, [password]);

  const clearPassword = useCallback(() => {
    setPassword('');
    setStrengthResult(null);
  }, []);

  const characterCount = useMemo(() => password.length, [password]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased">
      <div className="w-full max-w-2xl bg-gray-800 shadow-2xl rounded-xl p-6 sm:p-8 lg:p-10 ring-1 ring-gray-700">
        <header className="mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-purple-500 to-pink-500">
            Walid PassAnalyzer
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Elevate your password security. Instantly analyze strength & get expert tips.
          </p>
        </header>

        <main>
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

          {strengthResult && password ? (
            <>
              <section className="my-6">
                 <StrengthMeter score={strengthResult.score} />
              </section>
              
              <section>
                <FeedbackDisplay result={strengthResult} />
              </section>
            </>
          ) : (
             <div className="mt-8 p-6 bg-gray-850/50 rounded-lg text-center border border-gray-700/70">
               <p className="text-gray-400 text-base">
                 Enter a password above to reveal its strength and receive improvement suggestions.
               </p>
             </div>
          )}
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

export default App;