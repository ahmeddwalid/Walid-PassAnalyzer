import { SCORE_VERDICTS } from '../constants';
import { buildRecommendations } from '../lib/recommendations';
import { formatDateForFilename, formatGuesses, formatPowerOfTen, pluralize } from '../lib/format';
import type { ReportData } from '../types';

const REPORT_TITLE = 'Password assessment report';
const REPORT_DISCLAIMER =
  'This report was generated locally in the browser. It intentionally contains no password, no password fragment, and no complete hash. Estimates are model-based, not predictions or guarantees.';

function labelPattern(index: number, start: number, end: number): string {
  return `${index + 1}. Characters ${start}-${end}`;
}

function pdfPower(log10: number): string {
  return `10^${Math.max(0, Math.round(log10))}`;
}

function pdfGuesses(log10: number): string {
  if (!Number.isFinite(log10)) return 'an uncountable number';
  if (log10 < 3) return `about ${Math.round(10 ** log10).toLocaleString('en-US')} guesses`;
  return `about ${pdfPower(log10)} guesses`;
}

export function buildReportText({ analysis, breach, generatedAt }: ReportData): string {
  const verdict = SCORE_VERDICTS[analysis.score];
  const lines: string[] = [
    'WALID PASSANALYZER',
    'PASSWORD ASSESSMENT REPORT',
    '='.repeat(64),
    `Generated: ${generatedAt.toISOString()}`,
    REPORT_DISCLAIMER,
    '',
    'ASSESSMENT',
    '-'.repeat(64),
    `Verdict: ${verdict.label}`,
    `Model score: ${analysis.score} of 4`,
    `Estimated guesses: ${formatGuesses(analysis.guessesLog10)} (${formatPowerOfTen(analysis.guessesLog10)})`,
    `Candidate length: ${pluralize(analysis.codePointLength, 'character')}`,
    `Only whitespace: ${analysis.onlyWhitespace ? 'yes' : 'no'}`,
    `Contains non-ASCII characters: ${analysis.hasUnicode ? 'yes' : 'no'}`,
    `Recognized pattern coverage: ${(analysis.patternCoverage * 100).toFixed(0)}%`,
    `zxcvbn model time: ${analysis.calcTimeMs} ms`,
    '',
    'RESISTANCE BY ATTACK MODEL',
    '-'.repeat(64),
    ...analysis.attacks.map((attack) => `${attack.label} (${attack.rateLabel}): ${attack.display}`),
    '',
    'WHY THIS RESULT',
    '-'.repeat(64),
  ];

  const foundPatterns = analysis.patterns.filter((pattern) => pattern.kind !== 'bruteforce');
  if (foundPatterns.length === 0) {
    lines.push('No dominant recognizable pattern was found.');
  } else {
    for (const [index, pattern] of foundPatterns.entries()) {
      lines.push(`${labelPattern(index, pattern.start, pattern.end)} [${pattern.kind}]`);
      lines.push(`  ${pattern.note}`);
    }
  }

  if (analysis.customMatches.length > 0) {
    lines.push('');
    lines.push(
      `Imported dictionary matches: ${analysis.customMatches.length}. Matched words are withheld from this report.`,
    );
    lines.push(
      'Organization-specific terms reduce the effective search space. Review whether the candidate depends on a recognizable term.',
    );
  }

  const recommendations = buildRecommendations(analysis);
  lines.push('', 'RECOMMENDATIONS', '-'.repeat(64));
  recommendations.forEach((recommendation, index) => {
    lines.push(`${index + 1}. ${recommendation.title}`);
    lines.push(`   ${recommendation.body}`);
  });

  lines.push('', 'OPTIONAL BREACH CHECK', '-'.repeat(64));
  if (!breach) {
    lines.push(
      'No breach result is included. The optional Pwned Passwords check was not run, or it did not return a result.',
    );
  } else if (breach.found) {
    lines.push(
      `Found in the Pwned Passwords corpus: ${breach.count.toLocaleString('en-US')} occurrences.`,
    );
    lines.push(
      'Do not use this candidate. Check the account provider and change any account that uses it.',
    );
  } else {
    lines.push('Not found in the Pwned Passwords corpus at the time of the query.');
    lines.push(
      'Absence from this corpus is not proof of safety. It only means this candidate was not in the queried dataset.',
    );
  }
  if (breach) {
    lines.push(`Checked: ${breach.checkedAt.toISOString()}`);
    lines.push('Network disclosure: only the first five SHA-1 hex characters were sent.');
  }

  lines.push(
    '',
    'METHOD AND LIMITS',
    '-'.repeat(64),
    'Strength is estimated with zxcvbn 4.4.2, which models dictionaries, keyboard patterns, repeats, sequences, dates, and substitution patterns. The optional imported-dictionary pass re-estimates with matched organization terms.',
    "Attack times use zxcvbn's illustrative rates. Real hardware, hash cost settings, rate limiting, password normalization, and attacker knowledge vary by orders of magnitude.",
    "The estimate assumes the candidate is not already present in an attacker's breach corpus. A strong score cannot detect reuse or prior disclosure.",
    'zxcvbn is a mature estimator, not a formal proof. No password should be treated as universally safe.',
    '',
    'PRIVACY',
    '-'.repeat(64),
    REPORT_DISCLAIMER,
    '',
    'End of report.',
  );

  return lines.join('\n');
}

type JsPdfDocument = InstanceType<(typeof import('jspdf'))['jsPDF']>;

function asciiSafe(value: string): string {
  return (
    value
      .replace(/\u2013|\u2014/g, '-')
      .replace(/\u2018|\u2019/g, "'")
      .replace(/\u201c|\u201d/g, '"')
      .replace(/\u2022/g, '-')
      .replace(/\u2026/g, '...')
      // PDF built-in fonts are WinAnsi; replace characters outside the safe range.
      // eslint-disable-next-line no-control-regex
      .replace(/[^\u0000-\u007f]/g, '?')
  );
}

export async function buildReportPdf({ analysis, breach, generatedAt }: ReportData): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc: JsPdfDocument = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const petrol: [number, number, number] = [16, 43, 45];
  const vermilion: [number, number, number] = [180, 70, 48];
  const graphite: [number, number, number] = [45, 55, 55];
  const muted: [number, number, number] = [110, 120, 115];
  const rule: [number, number, number] = [210, 205, 190];

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 22) {
      doc.addPage();
      y = margin;
    }
  };

  const section = (title: string) => {
    ensureSpace(14);
    y += 4;
    doc.setFillColor(vermilion[0], vermilion[1], vermilion[2]);
    doc.rect(margin, y - 3, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(petrol[0], petrol[1], petrol[2]);
    doc.text(asciiSafe(title.toUpperCase()), margin + 6, y);
    y += 3;
    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
  };

  const paragraph = (
    text: string,
    options: {
      size?: number;
      color?: [number, number, number];
      indent?: number;
      gap?: number;
    } = {},
  ) => {
    const size = options.size ?? 9.5;
    const color = options.color ?? graphite;
    const indent = options.indent ?? 0;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(asciiSafe(text), contentWidth - indent) as string[];
    for (const line of lines) {
      ensureSpace(5);
      doc.text(line, margin + indent, y);
      y += size * 0.48;
    }
    y += options.gap ?? 2.5;
  };

  // Header
  doc.setFillColor(petrol[0], petrol[1], petrol[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(petrol[0], petrol[1], petrol[2]);
  doc.text('Walid PassAnalyzer', margin, y + 4);
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(vermilion[0], vermilion[1], vermilion[2]);
  doc.text('LOCAL PASSWORD INSTRUMENT / ASSESSMENT REPORT', margin, y + 11);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(`Generated ${asciiSafe(generatedAt.toISOString())}`, pageWidth - margin, y + 4, {
    align: 'right',
  });
  doc.setDrawColor(rule[0], rule[1], rule[2]);
  doc.line(margin, y + 17, pageWidth - margin, y + 17);
  y += 27;

  // Verdict banner
  const verdict = SCORE_VERDICTS[analysis.score];
  doc.setFillColor(245, 242, 233);
  doc.rect(margin, y - 5, contentWidth, 27, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('OVERALL ASSESSMENT', margin + 5, y + 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(petrol[0], petrol[1], petrol[2]);
  doc.text(asciiSafe(verdict.label), margin + 5, y + 11);
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.text(
    `score ${analysis.score}/4   |   ${pdfGuesses(analysis.guessesLog10)}   |   ${analysis.codePointLength} characters`,
    margin + 5,
    y + 17,
  );
  y += 31;

  paragraph(verdict.summary, { size: 10, color: graphite, gap: 4 });

  section('Assessment');
  paragraph(`Estimated guesses: ${pdfGuesses(analysis.guessesLog10)}`, { indent: 0 });
  paragraph(
    `Candidate length: ${pluralize(analysis.codePointLength, 'character')}. Recognized pattern coverage: ${(analysis.patternCoverage * 100).toFixed(0)}%.`,
  );
  paragraph(
    `Only whitespace: ${analysis.onlyWhitespace ? 'yes' : 'no'}. Contains non-ASCII characters: ${analysis.hasUnicode ? 'yes' : 'no'}.`,
  );

  section('Resistance by attack model');
  for (const attack of analysis.attacks) {
    ensureSpace(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(graphite[0], graphite[1], graphite[2]);
    doc.text(asciiSafe(attack.label), margin, y);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(asciiSafe(attack.rateLabel), margin + 62, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(vermilion[0], vermilion[1], vermilion[2]);
    doc.text(asciiSafe(attack.display), pageWidth - margin, y, { align: 'right' });
    y += 5.5;
  }
  paragraph(
    'These are illustrative model rates, not measurements of a specific service or machine. See the method and limits section.',
    { size: 8.5, color: muted, gap: 2 },
  );

  section('Why this result');
  const foundPatterns = analysis.patterns.filter((pattern) => pattern.kind !== 'bruteforce');
  if (foundPatterns.length === 0) {
    paragraph('No dominant recognizable pattern was found.');
  } else {
    foundPatterns.forEach((pattern, index) => {
      paragraph(
        `${labelPattern(index, pattern.start, pattern.end)} - ${pattern.kind}. ${pattern.note}`,
        { size: 9, gap: 1.5 },
      );
    });
  }
  if (analysis.customMatches.length > 0) {
    paragraph(
      `${analysis.customMatches.length} imported-dictionary ${analysis.customMatches.length === 1 ? 'match was' : 'matches were'} found. Matched words are withheld from this report and from its metadata.`,
      { size: 9, color: vermilion, gap: 3 },
    );
  }

  section('Recommendations');
  buildRecommendations(analysis).forEach((recommendation, index) => {
    paragraph(`${index + 1}. ${recommendation.title}`, {
      size: 9.5,
      color: petrol,
      gap: 0.5,
    });
    paragraph(recommendation.body, { size: 9, indent: 5, gap: 2 });
  });

  section('Optional breach check');
  if (!breach) {
    paragraph(
      'No breach result is included. The optional Pwned Passwords check was not run, or it did not return a result.',
    );
  } else if (breach.found) {
    paragraph(
      `Found in the Pwned Passwords corpus: ${breach.count.toLocaleString('en-US')} occurrences. Do not use this candidate.`,
      { color: vermilion },
    );
  } else {
    paragraph(
      'Not found in the Pwned Passwords corpus at the time of the query. Absence from this corpus is not proof of safety.',
    );
  }
  if (breach) {
    paragraph(
      `Checked ${breach.checkedAt.toISOString()}. Only the first five SHA-1 hex characters were sent. k-anonymity reduces disclosure; it does not make the request invisible to the service or network.`,
      { size: 8.5, color: muted },
    );
  }

  section('Method and limits');
  paragraph(
    "Strength is estimated with zxcvbn 4.4.2. It models dictionaries, keyboard patterns, repeats, sequences, dates, and substitutions. The optional imported-dictionary pass re-estimates with matched organization terms. The model assumes the candidate is not already in an attacker's breach corpus; a strong score cannot detect reuse or prior disclosure.",
  );
  paragraph(
    'Attack times are illustrative. Hardware, hash cost settings, rate limiting, normalization, and attacker knowledge vary by orders of magnitude. zxcvbn is a mature estimator, not a formal proof.',
  );

  section('Privacy');
  paragraph(REPORT_DISCLAIMER, { size: 8.5, color: muted });

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(
      'Generated locally by Walid PassAnalyzer. No password is included.',
      margin,
      pageHeight - 10,
    );
    doc.text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 10, {
      align: 'right',
    });
  }

  doc.setProperties({
    title: REPORT_TITLE,
    subject: 'Local password strength assessment. No password is included.',
    author: 'Walid PassAnalyzer',
    creator: 'Walid PassAnalyzer',
    keywords: 'password strength, zxcvbn, local analysis, no password',
  });

  return doc.output('blob');
}

export function reportFilename(format: 'pdf' | 'text', now = new Date()): string {
  const extension = format === 'pdf' ? 'pdf' : 'txt';
  return `passanalyzer-assessment-${formatDateForFilename(now)}.${extension}`;
}

export function downloadReport(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
