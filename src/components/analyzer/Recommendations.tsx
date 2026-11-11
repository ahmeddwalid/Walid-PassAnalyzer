import { buildRecommendations } from '../../lib/recommendations';
import type { AnalysisResult } from '../../types';

interface RecommendationsProps {
  result: AnalysisResult;
}

export function Recommendations({ result }: RecommendationsProps) {
  const recommendations = buildRecommendations(result);
  const candidate = recommendations.filter((item) => item.group === 'candidate');
  const hygiene = recommendations.filter((item) => item.group === 'hygiene');

  return (
    <section className="panel recommendations-panel" aria-labelledby="recommendations-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Next actions</p>
          <h2 id="recommendations-title" className="panel-title">
            What to do next
          </h2>
        </div>
        <span className="mono-meta">prioritized</span>
      </div>

      <ol className="recommendation-list">
        {candidate.map((recommendation, index) => (
          <li key={recommendation.title} className="recommendation">
            <span className="recommendation__number">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{recommendation.title}</h3>
              <p>{recommendation.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="hygiene-block">
        <p className="eyebrow">Account hygiene</p>
        <p className="hygiene-block__intro">
          These controls do not change the local estimate, but they change the consequences of a
          compromised password.
        </p>
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
