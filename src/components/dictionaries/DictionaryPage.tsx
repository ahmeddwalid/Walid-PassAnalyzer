import { useRef, useState } from 'react';
import {
  MAX_CUSTOM_DICTIONARIES,
  MAX_DICTIONARY_FILE_BYTES,
  MAX_DICTIONARY_WORD_LENGTH,
  MAX_DICTIONARY_WORDS,
} from '../../constants';
import { useDictionaries } from '../../contexts/DictionaryContext';
import { formatDateTime, formatNumber } from '../../lib/format';
import { DictionaryImportError } from '../../services/dictionaries';
import { WORD_LISTS } from '../../services/crypto';
import { Icon } from '../Icon';
import { PageIntro } from '../layout/PageIntro';
import { Callout } from '../ui/Callout';

type Message = { tone: 'success' | 'error'; text: string } | null;

export default function DictionaryPage() {
  const { dictionaries, addFromFile, addFromText, remove, toggle, clearAll } = useDictionaries();
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pasteName, setPasteName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const imported = await addFromFile(file);
      const duplicateText =
        imported.stats.duplicatesRemoved > 0
          ? ` ${formatNumber(imported.stats.duplicatesRemoved)} duplicate or empty entries were removed.`
          : '';
      setMessage({
        tone: 'success',
        text: `"${imported.dictionary.name}" imported with ${formatNumber(imported.stats.uniqueWords)} unique words.${duplicateText}`,
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text:
          error instanceof DictionaryImportError
            ? error.message
            : 'The dictionary could not be imported. No file contents were sent anywhere.',
      });
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteImport = () => {
    setMessage(null);
    try {
      const imported = addFromText(pasteText, pasteName || 'Pasted list');
      setMessage({
        tone: 'success',
        text: `"${imported.dictionary.name}" imported with ${formatNumber(imported.stats.uniqueWords)} unique words.`,
      });
      setPasteText('');
      setPasteName('');
    } catch (error) {
      setMessage({
        tone: 'error',
        text:
          error instanceof DictionaryImportError
            ? error.message
            : 'The pasted list could not be imported.',
      });
    }
  };

  const handleRemove = (id: string) => {
    if (confirmRemove !== id) {
      setConfirmRemove(id);
      return;
    }
    remove(id);
    setConfirmRemove(null);
    setMessage({ tone: 'success', text: 'Dictionary removed from this session.' });
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearAll();
    setConfirmClear(false);
    setConfirmRemove(null);
    setMessage({ tone: 'success', text: 'All custom dictionaries were cleared.' });
  };

  return (
    <div className="page page--dictionaries">
      <PageIntro
        number="04"
        label="Dictionaries"
        title={
          <>
            Make the local model
            <br />
            <span className="display-title__accent">know your terms.</span>
          </>
        }
        lede="Import organization-specific words so the analyzer can detect them. Imports stay in this tab, are never persisted, and are never included in exported reports."
        meta={
          <>
            <span className="hero-meta-item">
              <span className="status-dot" aria-hidden="true" /> in-memory only
            </span>
            <span className="hero-meta-item">
              {MAX_DICTIONARY_WORDS.toLocaleString('en-US')} word limit
            </span>
            <span className="hero-meta-item">no upload</span>
          </>
        }
      />

      <Callout tone="neutral" icon="offline" title="Session-scoped by design">
        Imported dictionaries are held in memory and disappear when this tab is reloaded. That is
        deliberate: organization-specific terms can be sensitive. The trade-off is that you must
        re-import a list after a refresh.
      </Callout>

      <div className="dictionary-layout">
        <div className="dictionary-primary">
          <section className="panel import-panel" aria-labelledby="import-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Import</p>
                <h2 id="import-title" className="panel-title">
                  Add a dictionary
                </h2>
              </div>
              <span className="mono-meta">
                {dictionaries.length} / {MAX_CUSTOM_DICTIONARIES}
              </span>
            </div>

            <label
              className={`dropzone${dragging ? ' dropzone--dragging' : ''}`}
              htmlFor="dictionary-file"
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void handleFile(event.dataTransfer.files[0] ?? null);
              }}
            >
              <input
                ref={fileInputRef}
                id="dictionary-file"
                type="file"
                accept=".json,.txt,application/json,text/plain"
                className="visually-hidden"
                onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
                disabled={busy}
              />
              <span className="dropzone__icon" aria-hidden="true">
                <Icon name="upload" size={22} />
              </span>
              <span className="dropzone__title">
                {busy ? 'Reading the file...' : 'Drop a file or choose one'}
              </span>
              <span className="dropzone__detail">
                JSON array, JSON object with a <code>words</code> array, or one word per line in
                TXT. Maximum {(MAX_DICTIONARY_FILE_BYTES / 1024 / 1024).toFixed(0)} MB.
              </span>
            </label>

            <details className="disclosure" open={false}>
              <summary>Or paste a list</summary>
              <div className="disclosure__body">
                <label className="field-label" htmlFor="paste-name">
                  Dictionary name
                </label>
                <input
                  id="paste-name"
                  className="text-input"
                  type="text"
                  maxLength={80}
                  value={pasteName}
                  onChange={(event) => setPasteName(event.target.value)}
                  placeholder="For example: Support team terms"
                />
                <label className="field-label" htmlFor="paste-words">
                  One word per line
                </label>
                <textarea
                  id="paste-words"
                  className="text-area"
                  rows={8}
                  value={pasteText}
                  onChange={(event) => setPasteText(event.target.value)}
                  placeholder={'project-falcon\nspring-launch\ninternal-tool'}
                />
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={handlePasteImport}
                  disabled={
                    pasteText.trim().length === 0 || dictionaries.length >= MAX_CUSTOM_DICTIONARIES
                  }
                >
                  Import pasted list
                </button>
              </div>
            </details>

            <div aria-live="polite">
              {message ? (
                <Callout
                  tone={message.tone === 'success' ? 'positive' : 'danger'}
                  icon={message.tone === 'success' ? 'check' : 'alert'}
                  title={message.tone === 'success' ? 'Dictionary imported' : 'Import failed'}
                >
                  {message.text}
                </Callout>
              ) : null}
            </div>

            <p className="field-hint">
              Limit: {formatNumber(MAX_DICTIONARY_WORDS)} words, {MAX_DICTIONARY_WORD_LENGTH}{' '}
              characters per word. Control characters and non-string JSON entries are rejected.
            </p>
          </section>

          <section className="panel" aria-labelledby="custom-dictionaries-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Active session</p>
                <h2 id="custom-dictionaries-title" className="panel-title">
                  Custom dictionaries
                </h2>
              </div>
              {dictionaries.length > 0 ? (
                <button
                  type="button"
                  className={`button button--compact ${confirmClear ? 'button--danger' : 'button--ghost'}`}
                  onClick={handleClearAll}
                >
                  {confirmClear ? 'Confirm clear all' : 'Clear all'}
                </button>
              ) : null}
            </div>

            {dictionaries.length === 0 ? (
              <div className="dictionary-empty">
                <Icon name="dictionary" size={22} />
                <p>
                  No custom dictionaries in this session. The analyzer still uses zxcvbn's built-in
                  dictionaries and common-password lists.
                </p>
              </div>
            ) : (
              <ul className="dictionary-list">
                {dictionaries.map((dictionary) => (
                  <li key={dictionary.id} className="dictionary-row">
                    <div className="dictionary-row__identity">
                      <label className="switch">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={dictionary.enabled}
                          onChange={(event) => toggle(dictionary.id, event.target.checked)}
                        />
                        <span className="switch__track" aria-hidden="true" />
                        <span className="visually-hidden">
                          {dictionary.enabled ? 'Disable' : 'Enable'} {dictionary.name}
                        </span>
                      </label>
                      <div>
                        <h3>{dictionary.name}</h3>
                        <p className="mono-meta">
                          {formatNumber(dictionary.words.length)} unique words · imported{' '}
                          {formatDateTime(dictionary.importedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="dictionary-row__actions">
                      <span
                        className={`status-pill ${dictionary.enabled ? 'status-pill--on' : ''}`}
                      >
                        {dictionary.enabled ? 'Active' : 'Disabled'}
                      </span>
                      {confirmRemove === dictionary.id ? (
                        <>
                          <button
                            type="button"
                            className="button button--danger button--compact"
                            onClick={() => handleRemove(dictionary.id)}
                          >
                            Confirm remove
                          </button>
                          <button
                            type="button"
                            className="button button--ghost button--compact"
                            onClick={() => setConfirmRemove(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="text-button text-button--danger"
                          onClick={() => handleRemove(dictionary.id)}
                          aria-label={`Remove ${dictionary.name}`}
                        >
                          <Icon name="trash" size={15} />
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="field-hint">
              Enabled dictionaries are used for analysis and are available as a passphrase source. A
              dictionary with a small word count offers weak passphrase entropy.
            </p>
          </section>
        </div>

        <aside className="dictionary-aside">
          <section className="aside-panel">
            <p className="eyebrow">How matching works</p>
            <ul className="aside-list">
              <li>Terms shorter than three characters are ignored to reduce noise.</li>
              <li>
                The longest match at a position wins; nested substrings are not counted twice.
              </li>
              <li>Matched terms are passed back to the strength model for re-estimation.</li>
              <li>Matched words never appear in the result card or export.</li>
              <li>Imported list contents are never written to local storage.</li>
            </ul>
            <details className="inline-details">
              <summary>Performance and limits</summary>
              <div className="inline-details__body">
                <p>
                  Matching uses an Aho-Corasick automaton built once per dictionary, so a large list
                  is scanned in time proportional to the candidate length rather than the number of
                  words. Imports are capped at {formatNumber(MAX_DICTIONARY_WORDS)} words and{' '}
                  {(MAX_DICTIONARY_FILE_BYTES / 1024 / 1024).toFixed(0)} MB.
                </p>
                <p>
                  Matching is case-insensitive. Terms are normalized to NFC and lowercased for
                  matching; your original file is not retained.
                </p>
              </div>
            </details>
          </section>

          <section className="aside-panel">
            <p className="eyebrow">Built-in passphrase lists</p>
            {Object.values(WORD_LISTS).map((list) => (
              <div key={list.id} className="wordlist-card">
                <h3>{list.name}</h3>
                <p>
                  {formatNumber(list.size)} words · {list.bitsPerWord.toFixed(2)} bits per word
                </p>
                <a
                  href={list.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  Source and license <Icon name="external" size={13} />
                </a>
              </div>
            ))}
            <p className="field-hint">
              These lists power passphrase generation. They are not added to zxcvbn's analysis
              dictionaries. zxcvbn's own word and password lists remain in the model.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
