export function ProgressionLineChart({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 160" fill="none" aria-hidden>
      <defs>
        <linearGradient id="lcGrad" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(245 158 11)" stopOpacity="0.35" />
          <stop offset="1" stopColor="rgb(251 191 36)" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="lcFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(245 158 11)" stopOpacity="0.25" />
          <stop offset="1" stopColor="rgb(245 158 11)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="24" y="20" width="352" height="120" rx="12" fill="rgb(24 24 27)" stroke="rgb(63 63 70 / 0.5)" />
      <path
        d="M48 118 L120 96 L192 88 L264 62 L336 44 L352 38"
        stroke="url(#lcGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M48 118 L120 96 L192 88 L264 62 L336 44 L352 38 V132 H48 Z"
        fill="url(#lcFill)"
        opacity="0.85"
      />
      {[48, 120, 192, 264, 336].map((x, i) => (
        <circle key={i} cx={x} cy={[118, 96, 88, 62, 44][i]} r="4" fill="rgb(251 191 36)" opacity="0.95" />
      ))}
    </svg>
  );
}

export function OneRMTrendChart({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 160" fill="none" aria-hidden>
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(212 212 216)" stopOpacity="0.9" />
          <stop offset="1" stopColor="rgb(82 82 91)" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <rect x="24" y="20" width="352" height="120" rx="12" fill="rgb(24 24 27)" stroke="rgb(63 63 70 / 0.5)" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const h = 28 + i * 14;
        const x = 56 + i * 52;
        return (
          <rect
            key={i}
            x={x}
            y={128 - h}
            width="28"
            height={h}
            rx="6"
            fill="url(#barGrad)"
            opacity={0.45 + i * 0.1}
          />
        );
      })}
      <path
        d="M70 100 Q200 40 330 48"
        stroke="rgb(245 158 11)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
}

export function MuscleBalanceRadar({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 200" fill="none" aria-hidden>
      <rect x="24" y="16" width="352" height="168" rx="12" fill="rgb(24 24 27)" stroke="rgb(63 63 70 / 0.5)" />
      <g transform="translate(200 100)">
        {[40, 65, 90].map((r) => (
          <polygon
            key={r}
            points={`0,-${r} ${r * 0.866},${r * 0.5} ${-r * 0.866},${r * 0.5}`}
            fill="none"
            stroke="rgb(63 63 70)"
            strokeWidth="0.5"
            opacity="0.6"
          />
        ))}
        <polygon
          points="0,-72 62,36 -62,36"
          fill="rgb(245 158 11 / 0.12)"
          stroke="rgb(245 158 11)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon
          points="0,-48 42,24 -42,24"
          fill="rgb(250 250 250 / 0.06)"
          stroke="rgb(161 161 170)"
          strokeWidth="1"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </g>
    </svg>
  );
}
