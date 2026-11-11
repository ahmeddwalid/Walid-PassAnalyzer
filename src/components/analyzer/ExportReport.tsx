import { useState } from 'react';
import {
  buildReportPdf,
  buildReportText,
  downloadReport,
  reportFilename,
} from '../../services/export';
import type { AnalysisResult, BreachResult } from '../../types';
import { Icon } from '../Icon';

interface ExportReportProps {
  result: AnalysisResult;
  breach: BreachResult | null;
  disabled: boolean;
}

type ExportState = 'idle' | 'pdf' | 'text' | 'success' | 'error';

export function ExportReport({ result, breach, disabled }: ExportReportProps) {
  const [state, setState] = useState<ExportState>('idle');
  const [message, setMessage] = useState('');

  const run = async (format: 'pdf' | 'text') => {
    setState(format);
    setMessage('');
    const report = { analysis: result, breach, generatedAt: new Date() };
    try {
      if (format === 'pdf') {
        const blob = await buildReportPdf(report);
        downloadReport(blob, reportFilename('pdf', report.generatedAt));
      } else {
        const text = buildReportText(report);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        downloadReport(blob, reportFilename('text', report.generatedAt));
      }
      setState('success');
      setMessage(
        `${format.toUpperCase()} exported locally. The report contains no password or matched word.`,
      );
    } catch {
      setState('error');
      setMessage(
        'The report could not be generated. Try the text format, or check whether the browser blocked the download.',
      );
    }
  };

  const busy = state === 'pdf' || state === 'text';

  return (
    <section className="panel export-panel" aria-labelledby="export-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Local export</p>
          <h2 id="export-title" className="panel-title">
            Assessment report
          </h2>
        </div>
        <span className="mono-meta">no password included</span>
      </div>

      <p className="export-intro">
        Generate a readable report with the verdict, attack estimates, pattern explanations,
        recommendations, and method limits. The report is produced in this tab and never uploaded.
      </p>

      <div className="export-actions">
        <button
          type="button"
          className="button button--primary"
          onClick={() => run('pdf')}
          disabled={disabled || busy}
        >
          <Icon name="download" size={16} />
          {state === 'pdf' ? 'Building PDF...' : 'Export PDF'}
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => run('text')}
          disabled={disabled || busy}
        >
          <Icon name="download" size={16} />
          {state === 'text' ? 'Building text...' : 'Export text'}
        </button>
      </div>

      {disabled ? (
        <p className="export-note">
          Wait for the current candidate to finish analysis before exporting.
        </p>
      ) : (
        <p className="export-note">
          The filename is generic. The PDF metadata and body contain no candidate text and no
          imported dictionary words.
        </p>
      )}

      <p className="visually-hidden" role="status" aria-live="polite">
        {message}
      </p>
      {state === 'success' || state === 'error' ? (
        <p className={`export-feedback export-feedback--${state}`}>{message}</p>
      ) : null}
    </section>
  );
}
