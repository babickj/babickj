import React from 'react'

/**
 * EdgeRunner SVG Logo
 * Design: A stylized "ER" monogram built from angular, blade-like forms
 * with a circuit-board accent and neon glow — evoking speed, edge computing,
 * and neural precision.
 */
export default function EdgeRunnerLogo({ size = 40, animated = false, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="er-grad-main" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="er-grad-accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <filter id="er-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="er-glow-strong">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer hexagonal border */}
      <polygon
        points="50,4 93,27 93,73 50,96 7,73 7,27"
        fill="none"
        stroke="url(#er-grad-main)"
        strokeWidth="2.5"
        opacity="0.8"
      />

      {/* Inner hexagonal ring */}
      <polygon
        points="50,12 85,31 85,69 50,88 15,69 15,31"
        fill="none"
        stroke="url(#er-grad-accent)"
        strokeWidth="1"
        opacity="0.3"
      />

      {/* Background fill */}
      <polygon
        points="50,12 85,31 85,69 50,88 15,69 15,31"
        fill="#0e1020"
        opacity="0.95"
      />

      {/* === E letterform === */}
      {/* Vertical stroke of E */}
      <rect x="22" y="28" width="5" height="44" fill="url(#er-grad-main)" rx="1" />
      {/* Top bar */}
      <rect x="22" y="28" width="22" height="5" fill="url(#er-grad-main)" rx="1" />
      {/* Middle bar */}
      <rect x="22" y="46" width="18" height="4.5" fill="url(#er-grad-main)" rx="1" />
      {/* Bottom bar */}
      <rect x="22" y="67" width="22" height="5" fill="url(#er-grad-main)" rx="1" />

      {/* === R letterform === */}
      {/* Vertical stroke of R */}
      <rect x="51" y="28" width="5" height="44" fill="url(#er-grad-main)" rx="1" />
      {/* Top horizontal of R bump */}
      <rect x="51" y="28" width="18" height="4.5" fill="url(#er-grad-main)" rx="1" />
      {/* Curved bump of R — approximated with rects + diagonal */}
      <rect x="64" y="28" width="5" height="20" fill="url(#er-grad-main)" rx="1" />
      <rect x="51" y="43" width="18" height="4.5" fill="url(#er-grad-main)" rx="1" />
      {/* Diagonal leg of R */}
      <polygon
        points="62,47.5 70,72 75,72 67,47.5"
        fill="url(#er-grad-main)"
      />

      {/* === Accent circuit nodes === */}
      {/* Node dots at corners */}
      <circle cx="50" cy="4" r="2.5" fill="#06b6d4" filter="url(#er-glow)" />
      <circle cx="93" cy="27" r="2.5" fill="#8b5cf6" filter="url(#er-glow)" />
      <circle cx="93" cy="73" r="2.5" fill="#6366f1" filter="url(#er-glow)" />
      <circle cx="50" cy="96" r="2.5" fill="#06b6d4" filter="url(#er-glow)" />
      <circle cx="7" cy="73" r="2.5" fill="#8b5cf6" filter="url(#er-glow)" />
      <circle cx="7" cy="27" r="2.5" fill="#6366f1" filter="url(#er-glow)" />

      {/* Speed accent line */}
      <line
        x1="7" y1="50" x2="17" y2="50"
        stroke="#06b6d4"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <line
        x1="83" y1="50" x2="93" y2="50"
        stroke="#06b6d4"
        strokeWidth="1.5"
        opacity="0.6"
      />

      {animated && (
        <>
          {/* Animated scan line */}
          <rect
            x="15" y="12" width="70" height="2"
            fill="url(#er-grad-accent)"
            opacity="0.4"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 0,74; 0,0"
              dur="3s"
              repeatCount="indefinite"
            />
          </rect>
        </>
      )}
    </svg>
  )
}

export function EdgeRunnerWordmark({ height = 36, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <EdgeRunnerLogo size={height} animated />
      <div className="flex flex-col leading-none">
        <span
          className="font-bold tracking-widest uppercase"
          style={{
            fontSize: height * 0.42,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          EdgeRunner
        </span>
        <span
          className="tracking-[0.3em] uppercase text-slate-400"
          style={{ fontSize: height * 0.22 }}
        >
          AI Agent Creator
        </span>
      </div>
    </div>
  )
}
