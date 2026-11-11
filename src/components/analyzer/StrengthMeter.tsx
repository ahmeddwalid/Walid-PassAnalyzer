import type { StrengthTier } from '../../lib/verdict';
import { Icon } from '../Icon';

interface StrengthMeterProps {
  tier: StrengthTier;
  tone: 'danger' | 'caution' | 'warning' | 'positive';
  qualifier: string | null;
  zxcvbnScore: number;
}

const STEPS: Array<{ tier: StrengthTier; label: string }> = [
  { tier: 0, label: 'Very weak' },
  { tier: 1, label: 'Weak' },
  { tier: 2, label: 'Fair' },
  { tier: 3, label: 'Good' },
  { tier: 4, label: 'Strong' },
];

export function StrengthMeter({ tier, tone, qualifier, zxcvbnScore }: StrengthMeterProps) {
  const activeStep = STEPS[tier];
  const ariaSummary = qualifier
    ? `Strength level ${activeStep?.label ?? 'Very weak'} (${qualifier}; zxcvbn score ${zxcvbnScore} of 4)`
    : `Strength level ${activeStep?.label ?? 'Very weak'} (zxcvbn score ${zxcvbnScore} of 4)`;

  return (
    <div className={`strength-meter strength-meter--${tone}`}>
      <div className="strength-meter__track" role="img" aria-label={ariaSummary}>
        {STEPS.map((step) => {
          const filled = step.tier <= tier;
          const active = step.tier === tier;
          return (
            <div
              key={step.tier}
              className="strength-meter__step"
              data-filled={filled ? 'true' : undefined}
              data-active={active ? 'true' : undefined}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <div className="strength-meter__labels" aria-hidden="true">
        {STEPS.map((step) => {
          const active = step.tier === tier;
          return (
            <span
              key={step.tier}
              className="strength-meter__label"
              data-active={active ? 'true' : undefined}
            >
              {active ? (
                <Icon
                  name={tier >= 3 ? 'check' : 'alert'}
                  size={12}
                  className="strength-meter__icon"
                />
              ) : null}
              <span>{step.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
