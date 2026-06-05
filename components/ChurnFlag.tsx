export function ChurnFlag({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  if (size === 'lg') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-bad-50 px-2.5 py-1 text-xs font-semibold text-bad-700">
        <span aria-hidden>🚩</span> Churn risk
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center text-bad-600"
      title="Churn risk"
      aria-label="Churn risk"
    >
      🚩
    </span>
  );
}
