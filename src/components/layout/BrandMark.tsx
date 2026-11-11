interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 34 }: BrandMarkProps) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1" y="1" width="38" height="38" rx="3" fill="currentColor" />
      <path
        d="M10 29V18M16 29V10M22 29V21M28 29V14"
        stroke="var(--mark-ink)"
        strokeWidth="2.4"
        strokeLinecap="square"
      />
      <circle cx="28" cy="32" r="2.2" fill="var(--accent)" />
    </svg>
  );
}
