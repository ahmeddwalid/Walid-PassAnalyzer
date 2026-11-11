import { useCallback, useEffect, useRef, useState } from 'react';
import { ANALYSIS_DEBOUNCE_MS } from '../../constants';
import { useDictionaries } from '../../contexts/DictionaryContext';
import { useDebouncedVersionedValue } from '../../hooks/useDebouncedValue';
import { readAutoClear, persistAutoClear } from '../../lib/preferences';
import {
  AnalysisError,
  analyzePassword,
  isAnalyzerReady,
  loadAnalyzer,
} from '../../services/analysis';
import type { AnalysisResult, BreachResult } from '../../types';
import { Icon } from '../Icon';
import { PageIntro } from '../layout/PageIntro';
import { AnalyzerAside } from './AnalyzerAside';
import { AnalyzerEmptyState } from './AnalyzerEmptyState';
import { AssessmentSummary } from './AssessmentSummary';
import { AttackSpectrum } from './AttackSpectrum';
import { BreachCheck } from './BreachCheck';
import { ExportReport } from './ExportReport';
import { PasswordField } from './PasswordField';
import { PatternFindings } from './PatternFindings';
import { Recommendations } from './Recommendations';

const AUTO_CLEAR_DELAY_MS = 5 * 60 * 1000;

export default function AnalyzerPage() {
  const { dictionaries } = useDictionaries();
  const [password, setPassword] = useState('');
  const [inputVersion, setInputVersion] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzedVersion, setAnalyzedVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyzerReady, setAnalyzerReady] = useState(isAnalyzerReady);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [breach, setBreach] = useState<BreachResult | null>(null);
  const [autoClear, setAutoClear] = useState(readAutoClear);
  const [autoClearMessage, setAutoClearMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const debounced = useDebouncedVersionedValue(password, inputVersion, ANALYSIS_DEBOUNCE_MS);
  const isStale = password.length > 0 && inputVersion !== analyzedVersion;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAnalyzer()
        .then(() => setAnalyzerReady(true))
        .catch((caught) => {
          setLoadError(
            caught instanceof AnalysisError
              ? caught.message
              : 'The local strength model could not be loaded.',
          );
        });
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!analyzerReady || debounced.value.length === 0) return;
    // The model runs in a worker. The cancellation flag prevents a late result
    // from overwriting a newer candidate after the debounce has moved on.
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const next = await analyzePassword(debounced.value, dictionaries);
          if (cancelled) return;
          setResult(next);
          setAnalyzedVersion(debounced.version);
          setError(null);
        } catch (caught) {
          if (cancelled) return;
          setResult(null);
          setError(
            caught instanceof AnalysisError
              ? caught.message
              : 'The local assessment could not complete. The candidate was not logged or transmitted.',
          );
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [debounced, analyzerReady, dictionaries]);

  useEffect(() => {
    persistAutoClear(autoClear);
  }, [autoClear]);

  useEffect(() => {
    if (!autoClear || password.length === 0) return;
    const timer = window.setTimeout(() => {
      setPassword('');
      setInputVersion((version) => version + 1);
      setResult(null);
      setBreach(null);
      setAutoClearMessage('Candidate cleared after five minutes of inactivity.');
    }, AUTO_CLEAR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoClear, password]);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    setInputVersion((version) => version + 1);
    if (value.length === 0) setResult(null);
    setBreach(null);
    setError(null);
    setAutoClearMessage('');
  }, []);

  const handleClear = useCallback(() => {
    setPassword('');
    setInputVersion((version) => version + 1);
    setResult(null);
    setBreach(null);
    setError(null);
    setAutoClearMessage('');
  }, []);

  const handleExample = useCallback(
    (value: string) => {
      handlePasswordChange(value);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    },
    [handlePasswordChange],
  );

  const handleAutoClearChange = useCallback((enabled: boolean) => {
    setAutoClear(enabled);
    setAutoClearMessage('');
  }, []);

  const statusTone: 'idle' | 'working' | 'ready' | 'error' =
    loadError || error
      ? 'error'
      : !analyzerReady || isStale
        ? 'working'
        : password.length === 0
          ? 'idle'
          : 'ready';

  const status = loadError
    ? loadError
    : !analyzerReady
      ? 'Preparing the local strength model...'
      : error
        ? 'Assessment failed. The candidate was not logged or transmitted.'
        : password.length === 0
          ? 'Waiting for a candidate. Nothing is sent anywhere.'
          : isStale
            ? 'Updating the assessment as you type...'
            : result
              ? `Analyzed locally in ${result.calcTimeMs.toLocaleString('en-US')} ms. Nothing left this tab.`
              : 'Ready to assess.';

  return (
    <div className="page page--analyzer">
      <PageIntro
        number="01"
        label="Analysis"
        title={
          <>
            Password analysis,
            <br />
            <span className="display-title__accent">without the theater.</span>
          </>
        }
        lede="Measure guessability locally, inspect the patterns behind the estimate, and see where the number stops being useful. No password is logged, stored, or transmitted."
        meta={
          <>
            <span className="hero-meta-item">
              <span className="status-dot" aria-hidden="true" /> Local model
            </span>
            <span className="hero-meta-item">zxcvbn 4.4.2</span>
            <span className="hero-meta-item">0 bytes sent by default</span>
            <span className="hero-meta-item">spaces and Unicode preserved</span>
          </>
        }
      />

      <div className="analyzer-layout">
        <div className="analyzer-main">
          <PasswordField
            password={password}
            onPasswordChange={handlePasswordChange}
            onClear={handleClear}
            inputRef={inputRef}
            autoClear={autoClear}
            onAutoClearChange={handleAutoClearChange}
            autoClearMessage={autoClearMessage}
            status={status}
            statusTone={statusTone}
            error={loadError ? null : error}
          />

          {password.length === 0 ? <AnalyzerEmptyState onLoadExample={handleExample} /> : null}

          {password.length > 0 && !result && !error && !loadError ? (
            <div className="panel waiting-panel" role="status">
              <Icon name="analyze" size={20} />
              <div>
                <p className="waiting-panel__title">
                  {analyzerReady ? 'Reading the pattern sequence' : 'Loading the local model'}
                </p>
                <p>
                  {analyzerReady
                    ? 'The result will appear here. Computation is local and should finish immediately.'
                    : 'The model is loaded once and then reused for every assessment.'}
                </p>
              </div>
            </div>
          ) : null}

          {result && password.length > 0 && !error && !loadError ? (
            <div className={`analyzer-results${isStale ? ' is-stale' : ''}`} aria-busy={isStale}>
              <AssessmentSummary result={result} />
              <AttackSpectrum result={result} />
              <PatternFindings result={result} />
              <Recommendations result={result} />
              {!isStale ? (
                <>
                  <BreachCheck password={password} result={breach} onResult={setBreach} />
                  <ExportReport result={result} breach={breach} disabled={isStale} />
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <AnalyzerAside />
      </div>
    </div>
  );
}
