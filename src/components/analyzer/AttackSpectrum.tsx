import { ATTACK_DEFINITIONS } from '../../constants';
import { getFastestAttack } from '../../lib/verdict';
import type { AnalysisResult } from '../../types';

interface AttackSpectrumProps {
  result: AnalysisResult;
}

const SCENARIO_CONTEXT: Record<string, string> = {
  online_throttling_100_per_hour: 'Login form with rate limits',
  online_no_throttling_10_per_second: 'Login form without rate limits',
  offline_slow_hashing_1e4_per_second: 'Leaked database (bcrypt / Argon2)',
  offline_fast_hashing_1e10_per_second: 'Leaked database (MD5 / SHA-1 / GPU)',
};

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export function AttackSpectrum({ result }: AttackSpectrumProps) {
  const fastest = getFastestAttack(result);

  return (
    <section className="detail-card" aria-labelledby="attack-title">
      <div className="detail-card__head">
        <div>
          <h3 id="attack-title" className="detail-card__title">
            Estimated time to crack
          </h3>
          <p className="detail-card__subtitle">
            {fastest ? (
              <>
                Most concerning route: <strong>{fastest.label.toLowerCase()}</strong> (
                <strong>{fastest.display}</strong>). These are illustrative estimates, not
                guarantees for a specific service.
              </>
            ) : (
              'No attack model is available for this candidate.'
            )}
          </p>
        </div>
      </div>

      <div className="crack-table-wrap">
        <table className="crack-table">
          <caption className="visually-hidden">
            Estimated crack times across four modeled attack scenarios
          </caption>
          <thead>
            <tr>
              <th scope="col">Scenario</th>
              <th scope="col">Assumed speed</th>
              <th scope="col">Estimated time</th>
            </tr>
          </thead>
          <tbody>
            {result.attacks.map((attack) => {
              const isFastest = fastest?.key === attack.key;
              const isVulnerable =
                Number.isFinite(attack.seconds) && attack.seconds < ONE_YEAR_SECONDS;
              return (
                <tr
                  key={attack.key}
                  className={isFastest && isVulnerable ? 'crack-table__row--weakest' : undefined}
                >
                  <td>
                    <span className="crack-scenario-name">{attack.label}</span>
                    <span className="crack-scenario-desc">
                      {SCENARIO_CONTEXT[attack.key] ?? ''}
                    </span>
                  </td>
                  <td className="crack-rate">{attack.rateLabel}</td>
                  <td className="crack-time">
                    <span>{attack.display}</span>
                    {isFastest && isVulnerable ? (
                      <span className="weakest-tag">Fastest risk</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="disclosure">
        <summary>Model assumptions and limits</summary>
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
            Estimates assume an attacker tries roughly half the search space on average. Actual
            hardware, hash work factors, rate limiting, and leaked wordlists can change times by
            orders of magnitude.
          </p>
        </div>
      </details>
    </section>
  );
}
