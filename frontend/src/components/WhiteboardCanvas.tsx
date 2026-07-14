interface WhiteboardStep {
  label: string;
  svgContent?: string;
}

interface WhiteboardCanvasProps {
  steps?: WhiteboardStep[];
  currentStep?: number;
}

export function WhiteboardCanvas({ steps = [], currentStep = 1 }: WhiteboardCanvasProps) {
  const totalSteps = Math.max(steps.length, 3);

  return (
    <div className="relative flex-1 flex items-center justify-center min-h-[400px]"
      style={{ background: '#FAFCFF' }}>
      {/* Grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(13,27,62,0.04) 1px, transparent 1px), linear-gradient(90deg,rgba(13,27,62,0.04) 1px,transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Step dots */}
      <div className="absolute top-3.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < currentStep - 1
                ? 'bg-green'
                : i === currentStep - 1
                ? 'bg-orange shadow-[0_0_0_3px_rgba(255,107,0,0.2)]'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <div className="absolute top-3 right-4 text-[11px] font-bold text-gray-400">
        Step {currentStep} / {totalSteps}
      </div>

      {/* Static sample diagram (Phase 3 will render dynamic SVG) */}
      <svg
        viewBox="0 0 540 400"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[90%] max-w-[540px] relative z-10"
      >
        <defs>
          <marker id="ah1" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#3949AB" />
          </marker>
          <marker id="ah2" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#DC2626" />
          </marker>
        </defs>

        {/* Step 1 — dimmed */}
        <g opacity="0.28">
          <circle cx="80" cy="120" r="22" fill="#FF6B00" />
          <text x="80" y="126" textAnchor="middle" fontSize="14" fill="#fff" fontWeight="700">⚽</text>
          <line x1="104" y1="120" x2="190" y2="120" stroke="#3949AB" strokeWidth="3" markerEnd="url(#ah1)" />
          <text x="144" y="108" fontSize="14" fill="#3949AB" fontWeight="800">v</text>
          <text x="80" y="88" textAnchor="middle" fontSize="13" fill="#374151" fontWeight="600">m = 2 kg</text>
          <rect x="220" y="100" width="140" height="40" rx="9" fill="#E8EAF6" />
          <text x="290" y="125" textAnchor="middle" fontSize="17" fill="#1A237E" fontWeight="800">p = m × v</text>
        </g>

        {/* Step 2 — active */}
        <rect x="58" y="220" width="14" height="70" rx="6" fill="#7C3AED"
          style={{ animation: 'sIn 0.7s ease forwards' }} />
        <ellipse cx="65" cy="215" rx="22" ry="12" fill="#A78BFA"
          style={{ animation: 'sIn 0.7s ease forwards' }} />
        <text x="52" y="308" fontSize="11" fill="#6B7280"
          style={{ animation: 'fUp 0.7s ease forwards' }}>Bat</text>

        <line x1="92" y1="248" x2="195" y2="248" stroke="#DC2626" strokeWidth="4" markerEnd="url(#ah2)"
          strokeDasharray="300" strokeDashoffset="0"
          style={{ animation: 'drw 1.2s ease forwards' }} />
        <text x="140" y="235" textAnchor="middle" fontSize="16" fill="#DC2626" fontWeight="900"
          style={{ animation: 'fUp 0.7s ease forwards' }}>F (Force)</text>

        <circle cx="228" cy="248" r="22" fill="#FF6B00" />
        <text x="228" y="254" textAnchor="middle" fontSize="14" fill="#fff" fontWeight="700">⚽</text>

        <circle cx="330" cy="240" r="26" fill="none" stroke="#D97706" strokeWidth="3"
          style={{ animation: 'pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }} />
        <text x="330" y="280" textAnchor="middle" fontSize="15" fill="#D97706" fontWeight="800"
          style={{ animation: 'fUp 0.7s ease forwards' }}>Δt</text>

        <rect x="386" y="220" width="136" height="44" rx="10" fill="#FEF3C7"
          style={{ animation: 'pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }} />
        <text x="454" y="247" textAnchor="middle" fontSize="18" fill="#B45309" fontWeight="900"
          style={{ animation: 'fUp 0.7s ease forwards' }}>J = F × Δt</text>

        <rect x="150" y="320" width="280" height="54" rx="13" fill="#0D1B3E"
          style={{ animation: 'fUp 0.7s ease forwards' }} />
        <text x="290" y="341" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.45)" fontWeight="700"
          style={{ animation: 'fUp 0.7s ease forwards' }}>KEY INSIGHT</text>
        <text x="290" y="362" textAnchor="middle" fontSize="15" fill="#FF8C42" fontWeight="900"
          style={{ animation: 'fUp 0.7s ease forwards' }}>Impulse = Δ Momentum</text>

        <text x="290" y="393" textAnchor="middle" fontSize="11" fill="#9CA3AF"
          style={{ animation: 'fUp 0.7s ease forwards' }}>
          Both measured in N·s — that&apos;s why they seem similar!
        </text>
      </svg>
    </div>
  );
}
