interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 28 }: BrandMarkProps) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 36 36"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="32" height="32" rx="8" fill="var(--mark-bg)" />
      <circle
        cx="18"
        cy="18.5"
        r="7.5"
        fill="none"
        stroke="var(--mark-ink)"
        strokeWidth="2.5"
        strokeDasharray="36 12"
        strokeDashoffset="3"
        strokeLinecap="round"
      />
      <path d="M18 7.5v3" stroke="var(--mark-ink)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="18" cy="18.5" r="2.8" fill="var(--mark-accent)" />
    </svg>
  );
}
