import { ATTACK_DEFINITIONS } from '../../constants';
import { clampLogPosition, secondsBeyondScale } from '../../lib/format';
import type { AnalysisResult } from '../../types';

interface AttackSpectrumProps {
  result: AnalysisResult;
}

const TICKS = [
  { label: '1 sec', seconds: 1 },
  { label: '1 hour', seconds: 3_600 },
  { label: '1 day', seconds: 86_400 },
  { label: '1 year', seconds: 31_557_600 },
  { label: '100 years', seconds: 3_155_760_000 },
];

export function AttackSpectrum({ result }: AttackSpectrumProps) {
  const fastest = [...result.attacks].sort((a, b) => a.seconds - b.seconds)[0];

  return (
    <section className="panel attack-panel" aria-labelledby="attack-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Resistance</p>
          <h2 id="attack-title" className="panel-title">
            Estimated work to exhaust
          </h2>
        </div>
        <span className="mono-meta">log scale</span>
      </div>

      <p className="attack-intro">
        {fastest ? (
          <>
            The fastest modelled route is <strong>{fastest.label.toLowerCase()}</strong>, at{' '}
            <strong>{fastest.display}</strong>.
          </>
        ) : (
          'No attack model is available for this candidate.'
        )}{' '}
        These are illustrative rates, not a measurement of a specific service.
      </p>

      <div className="attack-legend" aria-hidden="true">
        <span>
          <span className="attack-shape attack-shape--online" /> Online interface
        </span>
        <span>
          <span className="attack-shape attack-shape--offline" /> Offline hash database
        </span>
      </div>

      <div className="attack-chart">
        <div className="attack-ticks" aria-hidden="true">
          {TICKS.map((tick) => (
            <span
              key={tick.label}
              className="attack-tick"
              style={{ left: `${clampLogPosition(tick.seconds)}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>
        <ul className="attack-rows">
          {result.attacks.map((attack) => {
            const position = clampLogPosition(attack.seconds);
            const beyond = secondsBeyondScale(attack.seconds);
            return (
              <li key={attack.key} className="attack-row">
                <div className="attack-row__label">
                  <span
                    className={`attack-shape attack-shape--${attack.model}`}
                    aria-hidden="true"
                  />
                  <span>{attack.label}</span>
                  <span className="attack-row__rate">{attack.rateLabel}</span>
                </div>
                <div className="attack-row__track" aria-hidden="true">
                  <span
                    className={`attack-marker attack-marker--${attack.model}${beyond ? ' attack-marker--beyond' : ''}`}
                    style={{ left: `${position}%` }}
                  />
                </div>
                <div className="attack-row__value">
                  {attack.display}
                  {beyond ? '+' : ''}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <details className="disclosure">
        <summary>Assumptions behind these rates</summary>
        <div className="disclosure__body">
          <ul className="assumption-list">
            {ATTACK_DEFINITIONS.map((definition) => (
              <li key={definition.key}>
                <strong>{definition.label}</strong>
                <span>{definition.assumption}</span>
              </li>
            ))}
          </ul>
          <p>
            zxcvbn assumes the attacker needs roughly half the total guess space on average. Real
            hardware, rate limiting, password normalization, hash cost settings, and the attacker's
            wordlists can shift these times by orders of magnitude. A long estimate is not a
            guarantee.
          </p>
        </div>
      </details>
    </section>
  );
}
