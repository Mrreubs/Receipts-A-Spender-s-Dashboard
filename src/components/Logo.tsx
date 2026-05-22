interface LogoProps {
  size?: number
  showText?: boolean
}

export default function Logo({ size = 32, showText = false }: LogoProps) {
  const s = size
  return (
    <div className="flex items-center gap-3">
      <svg width={s} height={s} viewBox="0 0 48 48" className="shrink-0">
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
        <rect width={s} height={s} rx={s >= 48 ? 12 : s * 0.25} fill="url(#logoGrad)" />
        <path
          stroke="#fff" strokeWidth={s / 16} strokeLinecap="round" strokeLinejoin="round" fill="none"
          d="M14 14h20v22l-4-3-4 3-4-3-4 3-4-3V14z"
          transform={`scale(${s / 48})`}
        />
        <path
          stroke="#fff" strokeWidth={s / 20} strokeLinecap="round" fill="none"
          d="M18 20h12v0M18 24h12v0M18 28h8v0"
          transform={`scale(${s / 48})`}
        />
        <path
          stroke="#fff" strokeWidth={s / 16} strokeLinecap="round" fill="none"
          d="M30 14v4"
          transform={`scale(${s / 48})`}
        />
      </svg>
      {showText && (
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Receipts</p>
          <p className="text-[10px] text-gray-400 leading-tight">Spender's Dashboard</p>
        </div>
      )}
    </div>
  )
}
