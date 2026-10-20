// The Dexter mark: a textbook-style two-link arm reaching for the word "Dexter". Orange base disc with
// a pin bracket (bottom left), graphite link 1 rising to the elbow, orange link 2 coming down to the
// wrist, and a two-prong gripper pointing straight right at the "D". Transparent, drawn edge to edge.
// `animated`: the arm reaches towards the "D" and back (shoulder and elbow turn a few degrees).
export default function Logo({ size = 32, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} aria-label="Dexter logo" role="img" overflow="visible">
      {/* base disc and pin bracket */}
      <rect x="1" y="30" width="13" height="4.5" rx="1.6" fill="#F97316" />
      <rect x="4.2" y="26" width="5.6" height="5" rx="1.6" fill="#EA580C" />

      {/* everything above the shoulder turns about it (7, 27) */}
      <g className={animated ? 'logo-shoulder' : undefined} style={{ transformOrigin: '7px 27px' }}>
        {/* link 1: shoulder up to the elbow (15, 11) */}
        <line x1="7" y1="27" x2="15" y2="11" stroke="#1C1917" strokeWidth="4.4" strokeLinecap="round" />
        {/* link 2 and gripper turn about the elbow */}
        <g className={animated ? 'logo-elbow' : undefined} style={{ transformOrigin: '15px 11px' }}>
          <line x1="15" y1="11" x2="27" y2="22" stroke="#F97316" strokeWidth="4.2" strokeLinecap="round" />
          <line x1="27" y1="22" x2="29.3" y2="22" stroke="#1C1917" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M33.6 19.3 L29.6 19.8 L29.6 24.2 L33.6 24.7" fill="none" stroke="#1C1917" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="27" cy="22" r="1.7" fill="#FFFFFF" stroke="#1C1917" strokeWidth="1.3" />
        </g>
        <circle cx="15" cy="11" r="2.3" fill="#FFFFFF" stroke="#1C1917" strokeWidth="1.5" />
      </g>
      <circle cx="7" cy="27" r="2.4" fill="#FFFFFF" stroke="#1C1917" strokeWidth="1.5" />
    </svg>
  )
}
