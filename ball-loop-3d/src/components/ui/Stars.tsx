export function Star({ filled, size = 24, delay = 0, animate = false }: { filled: boolean; size?: number; delay?: number; animate?: boolean }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" aria-hidden
      style={animate && filled ? { animation: 'star-pop 0.5s ease-out both', animationDelay: `${delay}ms` } : undefined}
    >
      <path
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"
        fill={filled ? '#ffc83d' : 'rgba(255,255,255,0.14)'} stroke={filled ? '#ff9d00' : 'rgba(255,255,255,0.25)'} strokeWidth="1.2" strokeLinejoin="round"
      />
    </svg>
  )
}

export function Stars({ count, size = 22, animate = false, label }: { count: number; size?: number; animate?: boolean; label?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={label ?? `${count} of 3 stars`}>
      {[0, 1, 2].map(i => <Star key={i} filled={i < count} size={size} animate={animate} delay={i * 220} />)}
    </span>
  )
}
