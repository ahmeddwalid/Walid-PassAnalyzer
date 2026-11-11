import { describe, expect, it, vi } from 'vitest';
import { buildReportPdf, buildReportText, reportFilename } from '../export';
import type { AnalysisResult, BreachResult } from '../../types';

const { pdfText, pdfProperties } = vi.hoisted(() => ({
  pdfText: [] as string[],
  pdfProperties: [] as Array<Record<string, unknown>>,
}));

vi.mock('jspdf', () => ({
  jsPDF: class MockJsPdf {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    setFillColor() {}
    rect() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    text(value: string | string[]) {
      pdfText.push(Array.isArray(value) ? value.join(' ') : String(value));
    }
    setDrawColor() {}
    setLineWidth() {}
    line() {}
    splitTextToSize(value: string) {
      return [value];
    }
    addPage() {}
    getNumberOfPages() {
      return 1;
    }
    setPage() {}
    setProperties(value: Record<string, unknown>) {
      pdfProperties.push(value);
    }
    output() {
      return new Blob(['mock pdf'], { type: 'application/pdf' });
    }
  },
}));

const CANDIDATE = 'UniqueCandidate-Not-In-Report-9x';

const analysis: AnalysisResult = {
  score: 2,
  guesses: 1e9,
  guessesLog10: 9,
  attacks: [
    {
      key: 'online_throttling_100_per_hour',
      label: 'Throttled online',
      model: 'online',
      rateLabel: '100 attempts / hour',
      seconds: 1e7,
      display: 'months',
    },
    {
      key: 'online_no_throttling_10_per_second',
      label: 'Unthrottled online',
      model: 'online',
      rateLabel: '10 attempts / second',
      seconds: 1e8,
      display: 'years',
    },
    {
      key: 'offline_slow_hashing_1e4_per_second',
      label: 'Offline, slow hash',
      model: 'offline',
      rateLabel: '10,000 guesses / second',
      seconds: 1e5,
      display: 'days',
    },
    {
      key: 'offline_fast_hashing_1e10_per_second',
      label: 'Offline, fast hash',
      model: 'offline',
      rateLabel: '10 billion guesses / second',
      seconds: 0.1,
      display: 'less than a second',
    },
  ],
  patterns: [
    {
      kind: 'dictionary',
      start: 1,
      end: 6,
      length: 6,
      guessesLog10: 3,
      dictionaryName: 'common password',
      note: 'Matches a common password.',
    },
  ],
  feedback: { warning: '', suggestions: [] },
  customMatches: [
    {
      dictionaryId: 'org',
      dictionaryName: 'Org terms',
      start: 1,
      end: 6,
      wordLength: 6,
      severity: 'high',
    },
  ],
  dictionaryAdjusted: true,
  calcTimeMs: 8,
  codePointLength: 25,
  onlyWhitespace: false,
  hasUnicode: false,
  patternCoverage: 0.4,
};

const breach: BreachResult = {
  found: true,
  count: 42,
  checkedAt: new Date('2026-01-02T03:04:05Z'),
};

const report = {
  analysis,
  breach,
  generatedAt: new Date('2026-01-02T03:04:05Z'),
};

describe('report text', () => {
  it('contains useful assessment data and no candidate or matched word', () => {
    const text = buildReportText(report);
    expect(text).toContain('WALID PASSANALYZER');
    expect(text).toContain('Guessable');
    expect(text).toContain('RESISTANCE BY ATTACK MODEL');
    expect(text).toContain('RECOMMENDATIONS');
    expect(text).toContain('Imported dictionary matches: 1');
    expect(text).toContain('Pwned Passwords corpus');
    expect(text).toContain('no password');
    expect(text).not.toContain(CANDIDATE);
    expect(text).not.toContain('candidate-not');
    expect(text).toContain('Matched words are withheld');
  });

  it('uses generic, date-based filenames for both formats', () => {
    const now = new Date('2026-11-11T12:00:00Z');
    expect(reportFilename('pdf', now)).toBe('passanalyzer-assessment-2026-11-11.pdf');
    expect(reportFilename('text', now)).toBe('passanalyzer-assessment-2026-11-11.txt');
  });
});

describe('report PDF', () => {
  it('sets safe metadata and never writes the candidate or matched word', async () => {
    const blob = await buildReportPdf(report);
    expect(blob.type).toBe('application/pdf');
    const text = pdfText.join('\n');
    expect(text).toContain('Walid PassAnalyzer');
    expect(text).toContain('Guessable');
    expect(text).not.toContain(CANDIDATE);
    expect(text).not.toContain('falcon');
    expect(text).not.toContain('orion');
    expect(pdfProperties).toHaveLength(1);
    const metadata = pdfProperties[0];
    expect(metadata?.subject).toMatch(/No password is included/i);
    expect(JSON.stringify(metadata)).not.toContain(CANDIDATE);
  });
});
