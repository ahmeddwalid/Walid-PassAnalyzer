/* eslint-disable react-refresh/only-export-components */
export type EntropyBand = 'limited' | 'adequate' | 'strong' | 'exceptional';

export function entropyBand(bits: number): {
  band: EntropyBand;
  label: string;
  detail: string;
} {
  if (bits < 60) {
    return {
      band: 'limited',
      label: 'Limited',
      detail: 'Below the range usually recommended for a single-factor secret.',
    };
  }
  if (bits < 80) {
    return {
      band: 'adequate',
      label: 'Good',
      detail: 'Reasonable for many online accounts, especially with MFA.',
    };
  }
  if (bits < 100) {
    return {
      band: 'strong',
      label: 'Strong',
      detail: 'A large search space under the stated generation model.',
    };
  }
  return {
    band: 'exceptional',
    label: 'Exceptional',
    detail: 'Far beyond practical brute force under the stated model.',
  };
}

interface EntropyReadoutProps {
  bits: number;
  searchSpaceLog10: number;
  poolLabel: string;
  breakdown?: Array<{ label: string; bits: number }>;
}

export function EntropyReadout({
  bits,
  searchSpaceLog10,
  poolLabel,
  breakdown,
}: EntropyReadoutProps) {
  const band = entropyBand(bits);
  return (
    <div className="entropy-readout">
      <div className="entropy-readout__head">
        <div>
          <p className="eyebrow">Search-space entropy</p>
          <p className="entropy-number">
            {bits.toFixed(1)} <span>bits</span>
          </p>
        </div>
        <span className={`entropy-band entropy-band--${band.band}`}>{band.label}</span>
      </div>
      <div className="entropy-track" aria-hidden="true">
        <span
          className={`entropy-track__fill entropy-track__fill--${band.band}`}
          style={{ width: `${Math.min(100, (bits / 128) * 100)}%` }}
        />
      </div>
      <p className="entropy-detail">{band.detail}</p>
      <dl className="entropy-facts">
        <div>
          <dt>Possible outputs</dt>
          <dd>≈ 10^{searchSpaceLog10.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Selection space</dt>
          <dd>{poolLabel}</dd>
        </div>
      </dl>
      {breakdown ? (
        <ul className="entropy-breakdown">
          {breakdown.map((part) => (
            <li key={part.label}>
              <span>{part.label}</span>
              <span>{part.bits.toFixed(2)} bits</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="entropy-caveat">
        This figure describes the generator's uniform selection space. It is not a human-chosen
        strength estimate, and it does not account for storage, reuse, or breach exposure.
      </p>
    </div>
  );
}
