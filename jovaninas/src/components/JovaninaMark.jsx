// Original stylized silhouette inspired by Jovanina's storefront/menu
// portrait mark (curly hair, a rose tucked in it, dress collar) — drawn
// fresh as simple geometric shapes rather than tracing the restaurant's
// existing artwork, so it renders crisply at icon size in any ink color
// via `currentColor` and drops into the paper background via
// `var(--paper)` for the rose cutout.
export default function JovaninaMark({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Jovanina's mark"
    >
      <circle cx="34" cy="30" r="10" fill="currentColor" />
      <circle cx="44" cy="19" r="11" fill="currentColor" />
      <circle cx="57" cy="18" r="11" fill="currentColor" />
      <circle cx="68" cy="27" r="10" fill="currentColor" />
      <circle cx="29" cy="42" r="9" fill="currentColor" />
      <circle cx="71" cy="42" r="9" fill="currentColor" />
      <circle cx="50" cy="42" r="22" fill="currentColor" />
      <rect x="41" y="58" width="18" height="18" fill="currentColor" />
      <path d="M 18 100 Q 19 76 32 70 L 68 70 Q 81 76 82 100 Z" fill="currentColor" />
      <g fill="var(--paper)">
        <circle cx="37" cy="23" r="3.1" />
        <circle cx="32" cy="21" r="2.5" />
        <circle cx="41" cy="19" r="2.5" />
        <circle cx="34" cy="26" r="2.3" />
        <circle cx="40" cy="25" r="2.3" />
        <circle cx="37" cy="23" r="1.1" fill="currentColor" />
      </g>
    </svg>
  );
}
