import type { ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';

interface CalloutProps {
  tone?: 'neutral' | 'warning' | 'danger' | 'positive' | 'accent';
  icon?: IconName;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Callout({
  tone = 'neutral',
  icon = 'info',
  title,
  children,
  className = '',
}: CalloutProps) {
  return (
    <div className={`callout callout--${tone} ${className}`.trim()}>
      <Icon name={icon} size={17} className="callout__icon" />
      <div className="callout__body">
        {title ? <p className="callout__title">{title}</p> : null}
        <div className="callout__text">{children}</div>
      </div>
    </div>
  );
}
