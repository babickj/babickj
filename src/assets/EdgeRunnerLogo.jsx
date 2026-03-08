import React from 'react'

/**
 * EdgeRunner AI Logo
 * Red geometric "ER" monogram — three angular speed stripes (E) merged with an R letterform.
 * Triangular facets give a crystalline, tactical appearance.
 * Brand colors: #dc2626 (red) on pure black.
 */
export default function EdgeRunnerLogo({ size = 40, animated = false, className = '' }) {
  const w = size
  const h = size * 0.8

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="er-red-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="er-red-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>

      {/* === Three E stripes === */}
      {/* Top bar */}
      <polygon
        points="5,8 64,8 64,20 5,20"
        fill="url(#er-red-grad)"
        filter="url(#er-red-glow)"
      />
      {/* Top bar facet (dark triangle) */}
      <polygon points="52,8 64,8 64,20" fill="#7f1d1d" opacity="0.7" />

      {/* Middle bar */}
      <polygon
        points="5,32 56,32 56,44 5,44"
        fill="url(#er-red-grad)"
        filter="url(#er-red-glow)"
      />
      {/* Middle bar facet */}
      <polygon points="44,32 56,32 56,44" fill="#7f1d1d" opacity="0.7" />

      {/* Bottom bar */}
      <polygon
        points="5,56 64,56 64,68 5,68"
        fill="url(#er-red-grad)"
        filter="url(#er-red-glow)"
      />
      {/* Bottom bar facet */}
      <polygon points="52,56 64,56 64,68" fill="#7f1d1d" opacity="0.7" />

      {/* === R letterform === */}
      {/* R vertical stroke */}
      <rect x="62" y="8" width="10" height="60" fill="url(#er-red-grad)" filter="url(#er-red-glow)" rx="1" />

      {/* R bump (top right bump, like a P) */}
      <polygon
        points="72,8 86,8 91,14 91,26 86,32 72,32"
        fill="url(#er-red-grad)"
        filter="url(#er-red-glow)"
      />
      {/* R bump facet */}
      <polygon points="80,8 91,14 91,26 80,32 72,32 72,8" fill="#991b1b" opacity="0.4" />

      {/* R diagonal leg */}
      <polygon
        points="72,44 82,44 95,68 84,68"
        fill="url(#er-red-grad)"
        filter="url(#er-red-glow)"
      />
      {/* Leg facet */}
      <polygon points="72,44 82,44 82,50 72,52" fill="#7f1d1d" opacity="0.6" />

      {/* Animated red scan line */}
      {animated && (
        <rect x="5" y="0" width="90" height="1.5" fill="#ef4444" opacity="0.5">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,80; 0,0"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </rect>
      )}
    </svg>
  )
}

export function EdgeRunnerWordmark({ height = 36, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <EdgeRunnerLogo size={height * 1.25} animated />
      <div className="flex flex-col leading-none">
        <span
          className="font-bold tracking-wide"
          style={{
            fontSize: height * 0.44,
            color: '#ffffff',
            letterSpacing: '0.02em',
            fontWeight: 700,
          }}
        >
          <span style={{ color: '#ffffff' }}>edgerunner</span>
          <span style={{ color: '#dc2626', marginLeft: '0.25em', fontWeight: 800 }}>AI</span>
        </span>
        <span
          className="tracking-[0.25em] uppercase"
          style={{ fontSize: height * 0.21, color: '#6b7280', marginTop: 1 }}
        >
          Agent Creator
        </span>
      </div>
    </div>
  )
}
