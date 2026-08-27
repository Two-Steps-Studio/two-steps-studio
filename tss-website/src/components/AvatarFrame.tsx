"use client";

// Decorative Nitro-style avatar frames for the shop's "frame" category.
// Rendered as inline SVG (no image assets needed) - a fixed ring/gem/glow
// design per shop_items.id, drawn as a 100x100 annulus so it always scales
// cleanly regardless of the avatar size it's wrapped around.
//
// Used in three places: profile/page.tsx (equipped, around the real
// avatar), profile-form.tsx (settings picker swatches) and shop/page.tsx
// (shop listing preview) - kept as one component so all three stay visually
// identical instead of drifting.

const STUD_ANGLES_8 = [0, 45, 90, 135, 180, 225, 270, 315];

function studs(radius: number, size: number, fill: string, angles: number[] = STUD_ANGLES_8) {
  return angles.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const x = 50 + radius * Math.sin(rad);
    const y = 50 - radius * Math.cos(rad);
    return <circle key={deg} cx={x} cy={y} r={size} fill={fill} />;
  });
}

function FrameBronze() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden>
      <defs>
        <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c98a4b" />
          <stop offset="50%" stopColor="#8a5a2c" />
          <stop offset="100%" stopColor="#c98a4b" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#bronzeGrad)" strokeWidth="5" />
      <circle cx="50" cy="50" r="47" fill="none" stroke="#5c3a1a" strokeWidth="1" opacity="0.6" />
      {studs(47, 2, "#e0ab6f")}
    </svg>
  );
}

function FrameSilver() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden>
      <defs>
        <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f4f4f4" />
          <stop offset="45%" stopColor="#9a9a9a" />
          <stop offset="55%" stopColor="#e8e8e8" />
          <stop offset="100%" stopColor="#8c8c8c" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#silverGrad)" strokeWidth="4.5" />
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x = 50 + 47 * Math.sin(rad);
        const y = 50 - 47 * Math.cos(rad);
        return (
          <rect key={deg} x={x - 2.2} y={y - 2.2} width="4.4" height="4.4" fill="#fff" transform={`rotate(45 ${x} ${y})`} />
        );
      })}
    </svg>
  );
}

function FrameGold() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden>
      <defs>
        <radialGradient id="goldGrad" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="45%" stopColor="#ffcb2f" />
          <stop offset="100%" stopColor="#b8860b" />
        </radialGradient>
        <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#goldGrad)" strokeWidth="5.5" filter="url(#goldGlow)" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#ffcb2f" strokeWidth="0.75" opacity="0.5" />
      {studs(47, 2.4, "#fff3c4")}
    </svg>
  );
}

function FrameGeneral() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden>
      <defs>
        <linearGradient id="generalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7fe8e8" />
          <stop offset="100%" stopColor="#0a8f8f" />
        </linearGradient>
        <filter id="generalGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#generalGrad)" strokeWidth="5" filter="url(#generalGlow)" />
      {studs(47, 1.8, "#e6fffe", [0, 120, 240])}
    </svg>
  );
}

function FrameRgb() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden>
      <defs>
        <linearGradient id="rgbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff3b3b" />
          <stop offset="20%" stopColor="#ffcb2f" />
          <stop offset="40%" stopColor="#3dff6e" />
          <stop offset="60%" stopColor="#2fd9ff" />
          <stop offset="80%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#ff3b9e" />
        </linearGradient>
      </defs>
      <g className="animate-spin" style={{ transformOrigin: "50px 50px" }}>
        <circle cx="50" cy="50" r="47" fill="none" stroke="url(#rgbGrad)" strokeWidth="5" />
      </g>
      {studs(47, 2, "#ffffff", [30, 150, 270])}
    </svg>
  );
}

const FRAME_COMPONENTS: Record<string, () => React.ReactElement> = {
  "frame-bronze": FrameBronze,
  "frame-silver": FrameSilver,
  "frame-gold": FrameGold,
  "frame-general": FrameGeneral,
  "frame-rgb": FrameRgb,
};

export default function AvatarFrame({ frameId, className = "absolute -inset-1" }: { frameId: string | null | undefined; className?: string }) {
  if (!frameId) return null;
  const FrameComponent = FRAME_COMPONENTS[frameId];
  if (!FrameComponent) return null;

  return (
    <div className={`${className} rounded-full`}>
      <FrameComponent />
    </div>
  );
}
