import type { ReactNode } from 'react';

interface PageIntroProps {
  number: string;
  label: string;
  title: ReactNode;
  lede: string;
  meta?: ReactNode;
}

export function PageIntro({ number, label, title, lede, meta }: PageIntroProps) {
  return (
    <section className="page-intro" aria-labelledby="page-title">
      <div className="eyebrow page-intro__eyebrow">
        <span className="section-number">{number}</span>
        <span>{label}</span>
        <span className="eyebrow-rule" aria-hidden="true" />
      </div>
      <h1 id="page-title" data-page-title className="display-title">
        {title}
      </h1>
      <p className="page-intro__lede">{lede}</p>
      {meta ? <div className="page-intro__meta">{meta}</div> : null}
    </section>
  );
}
