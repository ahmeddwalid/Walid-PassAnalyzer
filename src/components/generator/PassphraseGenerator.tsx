import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PASSPHRASE_MAX_WORDS, PASSPHRASE_MIN_WORDS } from '../../constants';
import { useDictionaries } from '../../contexts/DictionaryContext';
import { formatBits, formatNumber } from '../../lib/format';
import {
  generatePassphrase,
  GeneratorConfigurationError,
  SecureRandomUnavailableError,
  WORD_LISTS,
  WordListUnavailableError,
} from '../../services/crypto';
import type {
  PassphraseGenerationResult,
  PassphraseGeneratorConfig,
  PassphraseWordListId,
} from '../../types';
import { Callout } from '../ui/Callout';
import { EntropyReadout } from './EntropyReadout';
import { GeneratorOutput } from './GeneratorOutput';

const DEFAULT_CONFIG: PassphraseGeneratorConfig = {
  wordCount: 6,
  wordList: 'eff-large',
  customWords: [],
  separator: '-',
  capitalization: 'none',
  includeNumber: false,
};

function messageFor(error: unknown): string {
  if (error instanceof SecureRandomUnavailableError) return error.message;
  if (error instanceof GeneratorConfigurationError) return error.message;
  if (error instanceof WordListUnavailableError) return error.message;
  return 'The passphrase could not be generated. No weaker fallback was used.';
}

const SEPARATORS = [
  { value: '-', label: 'Hyphen' },
  { value: ' ', label: 'Space' },
  { value: '.', label: 'Period' },
  { value: '_', label: 'Underscore' },
];

export function PassphraseGenerator() {
  const { dictionaries } = useDictionaries();
  const customDictionaries = useMemo(
    () => dictionaries.filter((dictionary) => dictionary.enabled),
    [dictionaries],
  );
  const [config, setConfig] = useState<PassphraseGeneratorConfig>(DEFAULT_CONFIG);
  const [customDictionaryId, setCustomDictionaryId] = useState('');
  const [result, setResult] = useState<PassphraseGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const generatedOnce = useRef(false);
  const requestId = useRef(0);

  const effectiveCustomId = customDictionaryId || customDictionaries[0]?.id || '';
  const selectedCustom = customDictionaries.find(
    (dictionary) => dictionary.id === effectiveCustomId,
  );

  const selectedWordList = config.wordList;
  const selectedMeta =
    selectedWordList === 'custom'
      ? null
      : WORD_LISTS[selectedWordList as Exclude<PassphraseWordListId, 'custom'>];

  const generateWith = useCallback(
    async (nextConfig: PassphraseGeneratorConfig, nextCustomId: string) => {
      requestId.current += 1;
      const currentRequest = requestId.current;
      setLoading(true);
      setError(null);
      try {
        const custom =
          nextConfig.wordList === 'custom'
            ? (customDictionaries.find((dictionary) => dictionary.id === nextCustomId) ??
              customDictionaries[0])
            : null;
        const customWords = custom?.words ?? [];
        const next = await generatePassphrase({
          ...nextConfig,
          customWords,
        });
        if (requestId.current !== currentRequest) return;
        setResult(next);
        setDirty(false);
      } catch (caught) {
        if (requestId.current !== currentRequest) return;
        setResult(null);
        setError(messageFor(caught));
      } finally {
        if (requestId.current === currentRequest) setLoading(false);
      }
    },
    [customDictionaries],
  );

  useEffect(() => {
    if (generatedOnce.current) return;
    generatedOnce.current = true;
    void generateWith(DEFAULT_CONFIG, '');
  }, [generateWith]);

  const update = (patch: Partial<PassphraseGeneratorConfig>) => {
    setConfig((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const handleGenerate = () => {
    void generateWith(config, effectiveCustomId);
  };

  const setWordCount = (wordCount: number) => {
    const next = { ...config, wordCount };
    setConfig(next);
    void generateWith(next, effectiveCustomId);
  };

  const wordListOptions: Array<{ id: PassphraseWordListId; label: string }> = [
    { id: 'eff-large', label: 'EFF Large · 7,776 words' },
    { id: 'eff-short', label: 'EFF Short · 1,296 words' },
    ...customDictionaries.map((dictionary) => ({
      id: 'custom' as const,
      label: `${dictionary.name} · ${formatNumber(dictionary.words.length)} words`,
    })),
  ];

  // A select cannot hold duplicate custom values. Custom dictionaries share the
  // "custom" value, so the dictionary selector below appears when it is active.
  const uniqueWordListOptions = Array.from(
    new Map(wordListOptions.map((option) => [option.id, option])).values(),
  );

  return (
    <div className="generator-layout">
      <div className="generator-primary">
        <GeneratorOutput
          value={result?.value ?? ''}
          label="Generated passphrase"
          loading={loading}
          dirty={dirty}
          error={error}
          onRegenerate={handleGenerate}
          meta={
            result ? (
              <div className="secret-metrics">
                <div>
                  <span>Words</span>
                  <strong>{result.wordCount}</strong>
                </div>
                <div>
                  <span>Length</span>
                  <strong>{Array.from(result.value).length}</strong>
                </div>
                <div>
                  <span>Entropy</span>
                  <strong>{formatBits(result.entropyBits)}</strong>
                </div>
                <div>
                  <span>List</span>
                  <strong>{formatNumber(result.listSize)}</strong>
                </div>
              </div>
            ) : (
              <p className="mono-meta">No passphrase generated yet.</p>
            )
          }
          footnote={
            result ? (
              <>
                <EntropyReadout
                  bits={result.entropyBits}
                  searchSpaceLog10={result.entropyBits / Math.log2(10)}
                  poolLabel={`${formatNumber(result.listSize)} words in ${result.wordListName}`}
                  breakdown={[
                    { label: `${result.wordCount} words`, bits: result.breakdown.words },
                    ...(result.breakdown.capitalization > 0
                      ? [{ label: 'Random capitalization', bits: result.breakdown.capitalization }]
                      : []),
                    ...(result.breakdown.number > 0
                      ? [{ label: 'Two-digit suffix', bits: result.breakdown.number }]
                      : []),
                  ]}
                />
                {result.warnings.length > 0 ? (
                  <div className="generator-warnings">
                    <p className="eyebrow">Consider</p>
                    <ul>
                      {result.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null
          }
        />

        <section className="generator-explainer">
          <p className="eyebrow">Why words</p>
          <h2>Memorability is a security property too.</h2>
          <p>
            A passphrase drawn uniformly from a large word list can be both strong and memorable.
            Six EFF Large words give about 77.5 bits from the words alone. The words are selected
            independently with the browser's cryptographic random source, not by a weaker
            pseudo-random shortcut.
          </p>
          <div className="explainer-facts">
            <div>
              <span className="mono-meta">default</span>
              <strong>6 words · 77.5 bits</strong>
            </div>
            <div>
              <span className="mono-meta">list</span>
              <strong>EFF Large · 7,776</strong>
            </div>
            <div>
              <span className="mono-meta">selection</span>
              <strong>uniform index sampling</strong>
            </div>
          </div>
          <p className="explainer-note">
            Capitalization rules and a fixed two-digit suffix add little compared with another
            randomly selected word. A suffix is not a substitute for length.
          </p>
        </section>
      </div>

      <aside className="generator-controls" aria-label="Passphrase generator controls">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Configuration</p>
              <h2 className="panel-title">Choose the word space</h2>
            </div>
          </div>

          <div className="control-group">
            <span className="field-label">Word count</span>
            <div className="word-presets" role="group" aria-label="Word count presets">
              {[4, 6, 8].map((count) => (
                <button
                  key={count}
                  type="button"
                  className="word-preset"
                  aria-pressed={config.wordCount === count}
                  onClick={() => setWordCount(count)}
                >
                  <strong>{count}</strong>
                  <span>{count === 6 ? 'recommended' : count === 4 ? 'compact' : 'longer'}</span>
                </button>
              ))}
            </div>
            <input
              type="range"
              min={PASSPHRASE_MIN_WORDS}
              max={PASSPHRASE_MAX_WORDS}
              value={config.wordCount}
              onChange={(event) => update({ wordCount: Number(event.target.value) })}
              aria-label="Passphrase word count"
              className="range-input"
            />
            <div className="range-ends">
              <span>{PASSPHRASE_MIN_WORDS}</span>
              <span>{config.wordCount} words</span>
              <span>{PASSPHRASE_MAX_WORDS}</span>
            </div>
          </div>

          <div className="control-group">
            <label className="field-label" htmlFor="word-list">
              Word list
            </label>
            <select
              id="word-list"
              className="select-input"
              value={config.wordList}
              onChange={(event) => update({ wordList: event.target.value as PassphraseWordListId })}
            >
              {uniqueWordListOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedMeta ? (
              <p className="field-hint">
                {selectedMeta.description} · {selectedMeta.license}
              </p>
            ) : null}
            {config.wordList === 'custom' && customDictionaries.length > 0 ? (
              <>
                <label className="field-label" htmlFor="custom-list">
                  Custom dictionary
                </label>
                <select
                  id="custom-list"
                  className="select-input"
                  value={effectiveCustomId}
                  onChange={(event) => setCustomDictionaryId(event.target.value)}
                >
                  {customDictionaries.map((dictionary) => (
                    <option key={dictionary.id} value={dictionary.id}>
                      {dictionary.name} · {formatNumber(dictionary.words.length)} words
                    </option>
                  ))}
                </select>
                {selectedCustom ? (
                  <p className="field-hint">
                    Each word adds {Math.log2(selectedCustom.words.length).toFixed(1)} bits. Small
                    custom lists can be much weaker than the EFF lists.
                  </p>
                ) : null}
              </>
            ) : null}
            {config.wordList === 'custom' && customDictionaries.length === 0 ? (
              <Callout tone="warning" icon="alert" title="No custom dictionary is active">
                Import and enable a dictionary on the Dictionaries page, or choose an EFF list.
              </Callout>
            ) : null}
          </div>

          <div className="control-group">
            <span className="field-label">Separator</span>
            <div className="separator-buttons" role="group" aria-label="Word separator">
              {SEPARATORS.map((separator) => (
                <button
                  key={separator.label}
                  type="button"
                  className="separator-button"
                  aria-pressed={config.separator === separator.value}
                  onClick={() => update({ separator: separator.value })}
                >
                  {separator.label}
                </button>
              ))}
            </div>
            <input
              className="text-input"
              type="text"
              maxLength={8}
              value={config.separator}
              onChange={(event) => update({ separator: event.target.value })}
              placeholder="Custom separator"
              aria-label="Custom separator"
            />
            {config.separator.length === 0 ? (
              <p className="field-hint">An empty separator joins the words directly.</p>
            ) : null}
          </div>

          <div className="control-group">
            <label className="field-label" htmlFor="capitalization">
              Capitalization
            </label>
            <select
              id="capitalization"
              className="select-input"
              value={config.capitalization}
              onChange={(event) =>
                update({
                  capitalization: event.target.value as PassphraseGeneratorConfig['capitalization'],
                })
              }
            >
              <option value="none">None (lowercase)</option>
              <option value="first">First word only</option>
              <option value="all">Every word</option>
              <option value="random">Random per word</option>
            </select>
            <p className="field-hint">
              Deterministic capitalization is known to an attacker and adds no entropy. Random case
              adds one decision per word but can hurt memorability.
            </p>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={config.includeNumber}
              onChange={(event) => update({ includeNumber: event.target.checked })}
            />
            <span>Append a two-digit number (10-99)</span>
          </label>

          <button
            type="button"
            className="button button--primary button--wide"
            onClick={handleGenerate}
            disabled={loading || (config.wordList === 'custom' && customDictionaries.length === 0)}
          >
            {loading ? 'Generating...' : 'Generate passphrase'}
          </button>
        </div>
      </aside>
    </div>
  );
}
