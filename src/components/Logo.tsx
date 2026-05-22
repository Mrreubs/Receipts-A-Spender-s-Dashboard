interface LogoProps {
  size?: number
  showText?: boolean
}

export default function Logo({ size = 32, showText = false }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 48 48" className="shrink-0">
        <defs>
          <linearGradient id="logoG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
        <rect width={48} height={48} rx={12} fill="url(#logoG)" />
        <path
          d="M16 13h12l6 7v16a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V15a2 2 0 0 1 2-2z"
          fill="none" stroke="#fff" strokeWidth={2.2} strokeLinejoin="round"
        />
        <path
          d="M28 13v7h7"
          fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d="M19 24h10M19 29h7"
          fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.7}
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
