/** BALL LOOP 3D wordmark: a glossy ball threading a neon loop. Pure SVG, scales to any size. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 190" className={className} role="img" aria-label="Ball Loop 3D">
      <defs>
        <radialGradient id="lg-ball" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#c8f7ff" />
          <stop offset="0.45" stopColor="#35b4ff" />
          <stop offset="1" stopColor="#1a2f9e" />
        </radialGradient>
        <linearGradient id="lg-text" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#c4e8ff" />
          <stop offset="1" stopColor="#5fb4ff" />
        </linearGradient>
        <linearGradient id="lg-loop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4fd8" />
          <stop offset="1" stopColor="#2fd8ff" />
        </linearGradient>
        <filter id="lg-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter="url(#lg-glow)">
        <ellipse cx="260" cy="58" rx="170" ry="40" fill="none" stroke="url(#lg-loop)" strokeWidth="9" strokeLinecap="round" strokeDasharray="520 40" transform="rotate(-6 260 58)" />
      </g>
      <circle cx="404" cy="40" r="22" fill="url(#lg-ball)" />
      <ellipse cx="397" cy="31" rx="7" ry="4.5" fill="#fff" opacity="0.65" />
      <text x="260" y="128" textAnchor="middle" fontFamily="ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif" fontWeight="900" fontSize="74" letterSpacing="2" fill="url(#lg-text)" stroke="#0d3b9e" strokeWidth="2.5" paintOrder="stroke">
        BALL LOOP
      </text>
      <text x="260" y="178" textAnchor="middle" fontFamily="ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif" fontWeight="900" fontSize="46" letterSpacing="14" fill="#ffc83d" stroke="#8a5300" strokeWidth="2" paintOrder="stroke">
        3D
      </text>
    </svg>
  )
}
