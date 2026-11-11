import { buildRecommendations } from '../../lib/recommendations';
import type { AnalysisResult } from '../../types';

interface RecommendationsProps {
  result: AnalysisResult;
}

export function Recommendations({ result }: RecommendationsProps) {
  const recommendations = buildRecommendations(result);
  const candidate = recommendations.filter((item) => item.group === 'candidate');
  const hygiene = recommendations.filter((item) => item.group === 'hygiene');
  const additional = candidate.slice(1);

  return (
    <section className="detail-card" aria-labelledby="recommendations-title">
      <div className="detail-card__head">
        <div>
          <h3 id="recommendations-title" className="detail-card__title">
            Recommendations &amp; account hygiene
          </h3>
          <p className="detail-card__subtitle">
            Additional ways to strengthen this password and reduce account takeover risk.
          </p>
        </div>
      </div>

      {additional.length > 0 ? (
        <ul className="recommendation-list">
          {additional.map((recommendation) => (
            <li key={recommendation.title} className="recommendation">
              <h4>{recommendation.title}</h4>
              <p>{recommendation.body}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="hygiene-block">
        <p className="hygiene-block__heading">Account-level protections</p>
        <ul className="hygiene-list">
          {hygiene.map((item) => (
            <li key={item.title}>
              <strong>{item.title}.</strong> {item.body}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
