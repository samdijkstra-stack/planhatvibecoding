export function ChurnFlag({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 12) / 11}
      viewBox="0 0 11 12"
      fill="currentColor"
      aria-label="Churn risk"
    >
      <path d="M1.5 0.5v11M1.5 0.5H9L6.8 4 9 7.5H1.5V0.5z" />
    </svg>
  );
}
