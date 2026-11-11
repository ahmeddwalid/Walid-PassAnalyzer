import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_PASSWORD_CONFIG,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PRESETS,
  SYMBOL_POOL,
} from '../../constants';
import { formatBits, formatPoolSize } from '../../lib/format';
import {
  generatePassword,
  GeneratorConfigurationError,
  SecureRandomUnavailableError,
  validatePasswordConfig,
} from '../../services/crypto';
import type {
  PasswordGenerationResult,
  PasswordGeneratorConfig,
  PasswordPreset,
} from '../../types';
import { Callout } from '../ui/Callout';
import { EntropyReadout } from './EntropyReadout';
import { GeneratorOutput } from './GeneratorOutput';

type PresetKey = Exclude<PasswordPreset, 'custom'>;

const CLASS_ROWS: Array<{
  key: keyof Pick<
    PasswordGeneratorConfig,
    'includeLowercase' | 'includeUppercase' | 'includeDigits' | 'includeSymbols' | 'includeSpace'
  >;
  label: string;
  sample: string;
  count: string;
}> = [
  { key: 'includeLowercase', label: 'Lowercase', sample: 'a-z', count: '26' },
  { key: 'includeUppercase', label: 'Uppercase', sample: 'A-Z', count: '26' },
  { key: 'includeDigits', label: 'Digits', sample: '0-9', count: '10' },
  {
    key: 'includeSymbols',
    label: 'Symbols',
    sample: SYMBOL_POOL,
    count: String(SYMBOL_POOL.length),
  },
  { key: 'includeSpace', label: 'Space', sample: 'space', count: '1' },
];

function errorMessage(error: unknown): string {
  if (error instanceof SecureRandomUnavailableError) return error.message;
  if (error instanceof GeneratorConfigurationError) return error.message;
  return 'The password could not be generated. No weaker fallback was used.';
}

export function PasswordGenerator() {
  const [config, setConfig] = useState<PasswordGeneratorConfig>({
    ...DEFAULT_PASSWORD_CONFIG,
  });
  const [preset, setPreset] = useState<PasswordPreset>('recommended');
  const [result, setResult] = useState<PasswordGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const generatedOnce = useRef(false);

  const validationErrors = useMemo(() => validatePasswordConfig(config), [config]);

  const generateWith = useCallback((nextConfig: PasswordGeneratorConfig) => {
    try {
      const next = generatePassword(nextConfig);
      setResult(next);
      setError(null);
      setDirty(false);
    } catch (caught) {
      setResult(null);
      setError(errorMessage(caught));
    }
  }, []);

  useEffect(() => {
    if (generatedOnce.current) return;
    generatedOnce.current = true;
    generateWith(DEFAULT_PASSWORD_CONFIG);
  }, [generateWith]);

  const updateConfig = (patch: Partial<PasswordGeneratorConfig>) => {
    setConfig((current) => ({ ...current, ...patch }));
    setPreset('custom');
    setDirty(true);
  };

  const applyPreset = (key: PresetKey) => {
    const next = { ...PASSWORD_PRESETS[key].config };
    setConfig(next);
    setPreset(key);
    generateWith(next);
  };

  const handleGenerate = () => {
    if (validationErrors.length > 0) {
      setError(validationErrors[0] ?? 'The configuration is not valid.');
      return;
    }
    generateWith(config);
  };

  return (
    <div className="generator-layout">
      <div className="generator-primary">
        <GeneratorOutput
          value={result?.value ?? ''}
          label="Generated password"
          loading={false}
          dirty={dirty}
          error={error}
          onRegenerate={handleGenerate}
          meta={
            result ? (
              <div className="secret-metrics">
                <div>
                  <span>Length</span>
                  <strong>{Array.from(result.value).length}</strong>
                </div>
                <div>
                  <span>Entropy</span>
                  <strong>{formatBits(result.entropyBits)}</strong>
                </div>
                <div>
                  <span>Pool</span>
                  <strong>{formatPoolSize(result.poolSize)}</strong>
                </div>
                <div>
                  <span>Classes</span>
                  <strong>{result.requiredClasses.length}</strong>
                </div>
              </div>
            ) : (
              <p className="mono-meta">No output generated yet.</p>
            )
          }
          footnote={
            result ? (
              <EntropyReadout
                bits={result.entropyBits}
                searchSpaceLog10={result.searchSpaceLog10}
                poolLabel={`${formatPoolSize(result.poolSize)} characters, uniform draw`}
              />
            ) : null
          }
        />

        <section className="generator-explainer">
          <p className="eyebrow">Why this is different</p>
          <h2>Every output is selected uniformly from the valid space.</h2>
          <p>
            The generator computes the exact number of strings that satisfy the selected class
            guarantees, then samples one without modulo bias. If secure browser randomness is
            unavailable, it fails closed instead of falling back to a weak source.
          </p>
          <div className="explainer-facts">
            <div>
              <span className="mono-meta">randomness</span>
              <strong>crypto.getRandomValues</strong>
            </div>
            <div>
              <span className="mono-meta">selection</span>
              <strong>uniform, rejection-sampled</strong>
            </div>
            <div>
              <span className="mono-meta">constraints</span>
              <strong>exact, not retry-based</strong>
            </div>
          </div>
          <p className="explainer-note">
            Clipboard access is controlled by your browser and operating system. Copying does not
            guarantee that clipboard history or synchronization is cleared.
          </p>
        </section>
      </div>

      <aside className="generator-controls" aria-label="Password generator controls">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Configuration</p>
              <h2 className="panel-title">Shape the search space</h2>
            </div>
          </div>

          <div className="preset-grid" role="group" aria-label="Password presets">
            {(Object.keys(PASSWORD_PRESETS) as PresetKey[]).map((key) => {
              const item = PASSWORD_PRESETS[key];
              return (
                <button
                  key={key}
                  type="button"
                  className="preset-button"
                  aria-pressed={preset === key}
                  onClick={() => applyPreset(key)}
                >
                  <span className="preset-button__name">{item.name}</span>
                  <span className="preset-button__detail">{item.description}</span>
                </button>
              );
            })}
            <button
              type="button"
              className="preset-button"
              aria-pressed={preset === 'custom'}
              onClick={() => setPreset('custom')}
            >
              <span className="preset-button__name">Custom</span>
              <span className="preset-button__detail">Set every rule yourself</span>
            </button>
          </div>

          <div className="control-group">
            <div className="control-label-row">
              <label htmlFor="password-length">Length</label>
              <div className="length-input">
                <input
                  id="password-length"
                  type="number"
                  min={PASSWORD_MIN_LENGTH}
                  max={PASSWORD_MAX_LENGTH}
                  value={config.length}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    updateConfig({
                      length: Number.isFinite(next) ? next : PASSWORD_MIN_LENGTH,
                    });
                  }}
                />
                <span>characters</span>
              </div>
            </div>
            <input
              type="range"
              min={PASSWORD_MIN_LENGTH}
              max={PASSWORD_MAX_LENGTH}
              value={config.length}
              onChange={(event) => updateConfig({ length: Number(event.target.value) })}
              aria-label="Password length"
              className="range-input"
            />
            <div className="range-ends">
              <span>{PASSWORD_MIN_LENGTH}</span>
              <span>{PASSWORD_MAX_LENGTH}</span>
            </div>
          </div>

          <fieldset className="control-group class-fieldset">
            <legend>Character classes</legend>
            {CLASS_ROWS.map((row) => (
              <label key={row.key} className="class-row">
                <input
                  type="checkbox"
                  checked={config[row.key]}
                  onChange={(event) => updateConfig({ [row.key]: event.target.checked })}
                />
                <span className="class-row__label">{row.label}</span>
                <code className="class-row__sample">{row.sample}</code>
                <span className="class-row__count">{row.count}</span>
              </label>
            ))}
          </fieldset>

          <details className="disclosure">
            <summary>Advanced exclusions</summary>
            <div className="disclosure__body">
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={config.excludeSimilar}
                  onChange={(event) => updateConfig({ excludeSimilar: event.target.checked })}
                />
                <span>Exclude look-alikes: I, l, 1, L, o, 0, O</span>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={config.excludeAmbiguous}
                  onChange={(event) => updateConfig({ excludeAmbiguous: event.target.checked })}
                />
                <span>Exclude bracket and punctuation look-alikes</span>
              </label>
              <label className="field-label" htmlFor="extra-characters">
                Add characters to the pool
              </label>
              <input
                id="extra-characters"
                className="text-input"
                type="text"
                maxLength={128}
                value={config.customCharacters}
                onChange={(event) => updateConfig({ customCharacters: event.target.value })}
                placeholder="For example: ~`|"
              />
              <p className="field-hint">
                Added characters expand the pool but are not forced to appear. Spaces are preserved
                if you include one.
              </p>
              <label className="field-label" htmlFor="excluded-characters">
                Exclude specific characters
              </label>
              <input
                id="excluded-characters"
                className="text-input"
                type="text"
                maxLength={128}
                value={config.excludeCharacters}
                onChange={(event) => updateConfig({ excludeCharacters: event.target.value })}
                placeholder="Characters that must never appear"
              />
            </div>
          </details>

          {validationErrors.length > 0 ? (
            <Callout tone="warning" icon="alert" title="This configuration cannot be generated">
              <ul className="compact-list">
                {validationErrors.map((validationError) => (
                  <li key={validationError}>{validationError}</li>
                ))}
              </ul>
            </Callout>
          ) : (
            <p className="generator-readiness">
              <span className="status-dot" aria-hidden="true" />
              Configuration is valid. Output will satisfy every selected class.
            </p>
          )}

          <button
            type="button"
            className="button button--primary button--wide"
            onClick={handleGenerate}
            disabled={validationErrors.length > 0}
          >
            Generate password
          </button>
        </div>
      </aside>
    </div>
  );
}
