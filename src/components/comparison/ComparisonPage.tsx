import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COMPARISON_DEBOUNCE_MS,
  MAX_COMPARISON_CANDIDATES,
  MIN_COMPARISON_CANDIDATES,
} from '../../constants';
import { useDictionaries } from '../../contexts/DictionaryContext';
import {
  analyzePassword,
  AnalysisError,
  isAnalyzerReady,
  loadAnalyzer,
} from '../../services/analysis';
import type { AnalysisResult, ComparisonEntry } from '../../types';
import { Icon } from '../Icon';
import { PageIntro } from '../layout/PageIntro';
import { Callout } from '../ui/Callout';
import { ComparisonInput } from './ComparisonInput';
import { ComparisonResults } from './ComparisonResults';

interface Candidate {
  id: string;
  value: string;
}

let nextCandidateId = 0;
function makeCandidate(): Candidate {
  nextCandidateId += 1;
  return { id: `candidate-${nextCandidateId}`, value: '' };
}

function labelFor(index: number): string {
  return `Candidate ${String.fromCharCode(65 + index)}`;
}

export default function ComparisonPage() {
  const { dictionaries } = useDictionaries();
  const [candidates, setCandidates] = useState<Candidate[]>(() => [
    makeCandidate(),
    makeCandidate(),
  ]);
  const [entries, setEntries] = useState<ComparisonEntry[]>([]);
  const [ready, setReady] = useState(isAnalyzerReady);
  const [inputVersion, setInputVersion] = useState(0);
  const [analyzedVersion, setAnalyzedVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    loadAnalyzer()
      .then(() => setReady(true))
      .catch(() =>
        setError('The local strength model could not be loaded. Reload the page to try again.'),
      );
  }, []);

  useEffect(() => {
    if (!ready) return;
    const requestVersion = inputVersion;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setError(null);
        try {
          const nonEmpty = candidates.filter((candidate) => candidate.value.length > 0);
          if (nonEmpty.length === 0) {
            setEntries([]);
            setAnalyzedVersion(requestVersion);
            return;
          }

          const analyses = new Map<string, AnalysisResult>();
          for (const candidate of nonEmpty) {
            if (!analyses.has(candidate.value)) {
              const analysis = await analyzePassword(candidate.value, dictionaries);
              if (cancelled) return;
              analyses.set(candidate.value, analysis);
            }
          }

          const nextEntries: ComparisonEntry[] = candidates
            .map((candidate, index) => ({ candidate, index }))
            .filter(({ candidate }) => candidate.value.length > 0)
            .map(({ candidate, index }) => {
              const analysis = analyses.get(candidate.value);
              if (!analysis) throw new AnalysisError('A comparison result was missing.');
              return {
                id: candidate.id,
                label: labelFor(index),
                analysis,
                rank: 0,
              };
            });

          const sorted = [...nextEntries].sort((left, right) => {
            if (right.analysis.guessesLog10 !== left.analysis.guessesLog10) {
              return right.analysis.guessesLog10 - left.analysis.guessesLog10;
            }
            return right.analysis.score - left.analysis.score;
          });

          let previousLog: number | null = null;
          let previousRank = 0;
          const ranked = sorted.map((entry, index) => {
            let rank = index + 1;
            if (
              previousLog !== null &&
              Math.abs(entry.analysis.guessesLog10 - previousLog) < 1e-9
            ) {
              rank = previousRank;
            }
            previousLog = entry.analysis.guessesLog10;
            previousRank = rank;
            return { ...entry, rank };
          });

          if (cancelled) return;
          setEntries(ranked);
          setAnalyzedVersion(requestVersion);
        } catch (caught) {
          if (cancelled) return;
          setEntries([]);
          setAnalyzedVersion(requestVersion);
          setError(
            caught instanceof AnalysisError
              ? caught.message
              : 'A candidate could not be analyzed. No candidate was logged or transmitted.',
          );
        }
      })();
    }, COMPARISON_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [candidates, ready, dictionaries, inputVersion]);

  const updateCandidate = useCallback((id: string, value: string) => {
    setCandidates((current) =>
      current.map((candidate) => (candidate.id === id ? { ...candidate, value } : candidate)),
    );
    setInputVersion((version) => version + 1);
  }, []);

  const addCandidate = useCallback(() => {
    if (candidates.length >= MAX_COMPARISON_CANDIDATES) return;
    const next = [...candidates, makeCandidate()];
    setCandidates(next);
    setInputVersion((version) => version + 1);
    window.requestAnimationFrame(() => inputRefs.current[next.length - 1]?.focus());
  }, [candidates]);

  const removeCandidate = useCallback((id: string) => {
    setCandidates((current) =>
      current.length <= MIN_COMPARISON_CANDIDATES
        ? current
        : current.filter((candidate) => candidate.id !== id),
    );
    setInputVersion((version) => version + 1);
  }, []);

  const clearAll = useCallback(() => {
    setCandidates([makeCandidate(), makeCandidate()]);
    setInputVersion((version) => version + 1);
    setEntries([]);
    setAnnouncement('All candidates cleared.');
    window.requestAnimationFrame(() => inputRefs.current[0]?.focus());
  }, []);

  const nonEmpty = candidates.filter((candidate) => candidate.value.length > 0);
  const uniqueCount = new Set(nonEmpty.map((candidate) => candidate.value)).size;
  const duplicateCount = nonEmpty.length - uniqueCount;
  const hasValues = nonEmpty.length > 0;
  const updating = ready && inputVersion !== analyzedVersion;

  return (
    <div className="page page--comparison">
      <PageIntro
        number="03"
        label="Comparison"
        title={
          <>
            Choose with evidence,
            <br />
            <span className="display-title__accent">not guesswork.</span>
          </>
        }
        lede="Compare up to six candidates by modelled guessability. Results are anonymized: the comparison never displays the candidate text, and no candidate is copied or exported."
        meta={
          <>
            <span className="hero-meta-item">
              <span className="status-dot" aria-hidden="true" /> local only
            </span>
            <span className="hero-meta-item">no plaintext in results</span>
            <span className="hero-meta-item">ranked by estimated guesses</span>
          </>
        }
      />

      <Callout tone="warning" icon="alert" title="Use invented candidates">
        Do not paste several live account passwords into any web page. Use test candidates that
        resemble the choices you are considering. This tool does not store them, but a browser
        extension, operating system, or another process on the device may still observe input.
      </Callout>

      <section className="panel comparison-inputs" aria-labelledby="comparison-inputs-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Inputs</p>
            <h2 id="comparison-inputs-title" className="panel-title">
              Candidates
            </h2>
          </div>
          <div className="input-actions">
            <button
              type="button"
              className="button button--secondary button--compact"
              onClick={addCandidate}
              disabled={candidates.length >= MAX_COMPARISON_CANDIDATES}
            >
              <Icon name="plus" size={15} />
              Add candidate
            </button>
            {hasValues ? (
              <button
                type="button"
                className="button button--ghost button--compact"
                onClick={clearAll}
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        <div className="comparison-input-grid">
          {candidates.map((candidate, index) => (
            <ComparisonInput
              key={candidate.id}
              label={labelFor(index)}
              value={candidate.value}
              onChange={(value) => updateCandidate(candidate.id, value)}
              onRemove={() => removeCandidate(candidate.id)}
              canRemove={candidates.length > MIN_COMPARISON_CANDIDATES}
              inputRef={(element) => {
                inputRefs.current[index] = element;
              }}
            />
          ))}
        </div>

        <div className="comparison-status-row">
          <span className={`analysis-status analysis-status--${updating ? 'working' : 'idle'}`}>
            <span className="analysis-status__mark" aria-hidden="true" />
            {!ready
              ? 'Preparing the local strength model...'
              : updating
                ? 'Comparing candidates...'
                : hasValues
                  ? 'Comparison is current.'
                  : 'Enter at least two candidates to compare.'}
          </span>
          <span className="mono-meta">{MAX_COMPARISON_CANDIDATES} candidates maximum</span>
        </div>
        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
      </section>

      {error ? (
        <Callout tone="danger" icon="alert" title="Comparison unavailable">
          {error}
        </Callout>
      ) : null}

      <ComparisonResults entries={entries} duplicateCount={duplicateCount} updating={updating} />

      {hasValues && entries.length === 0 && !error && !updating ? (
        <p className="comparison-note">Add another non-empty candidate to produce a ranking.</p>
      ) : null}
    </div>
  );
}
