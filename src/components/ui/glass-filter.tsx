/**
 * Hidden SVG filter definitions for the liquid glass effect.
 *
 * Must be mounted once before any .glass / .glass-sm elements render.
 * The filters are applied via CSS  `filter: url(#glass-filter)`  on a
 * ::after pseudo-element that also has `backdrop-filter: blur()`.
 * That combination is what produces real glass refraction:
 *   1. backdrop-filter captures + blurs what's behind the element
 *   2. filter: url() runs feDisplacementMap on that captured layer
 *
 * feTurbulence generates the displacement noise procedurally — no
 * external image or base64 payload needed.
 */
export function GlassFilter() {
  return (
    <svg
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      aria-hidden="true"
    >
      {/* Large surface — cards, panels */}
      <filter id="glass-filter" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.008 0.008"
          numOctaves="2"
          seed="92"
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="0.5" result="blur" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="blur"
          scale="30"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>

      {/* Small surface — buttons, pills */}
      <filter id="glass-filter-sm" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.02 0.02"
          numOctaves="2"
          seed="92"
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="0.5" result="blur" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="blur"
          scale="8"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
