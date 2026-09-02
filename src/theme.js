// ── GEDEELDE STIJL & BOUWSTENEN ───────────────────────────────────────────────
// Hergebruikt door App.js en de losse oefencomponenten (o.a. Flitswoorden).

// ── FONTS ─────────────────────────────────────────────────────────────────────
export const FONT_LINK_NUNITO = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap";
export const FONT_LINK_DYSLEXIC = "https://fonts.cdnfonts.com/css/opendyslexic";

// ── KLEUREN ───────────────────────────────────────────────────────────────────
export const C = {
  geel:      "#F5C400",
  geelLicht: "#FFF9DC",
  geelMid:   "#FFF3B0",
  zwart:     "#1A1A1A",
  creme:     "#FFFDF5",
  cremeMid:  "#FFF8E7",
  grijs:     "#6B6B6B",
  groenLicht:"#E6F4EC",
  groen:     "#1A7A4A",
  roodLicht: "#FEE2E2",
  rood:      "#DC2626",
  blauwLicht:"#EEF2FF",
  blauw:     "#4338CA",
  wit:       "#FFFFFF",
  rand:      "#E8E0C8",
  geelRand:  "#E8C766",
};

export function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ── LOGO SVG ──────────────────────────────────────────────────────────────────
export function Logo({ size = 40 }) {
  return (
    <svg width={size * 1.5} height={size} viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="lc"><ellipse cx="82" cy="122" rx="33" ry="43"/></clipPath></defs>
      <g transform={`scale(0.67)`}>
        <ellipse fill="#E8F4FF" opacity="0.9" cx="59" cy="74" rx="43" ry="25" transform="rotate(-28 59 74)"/>
        <ellipse fill="#E8F4FF" opacity="0.9" cx="105" cy="74" rx="43" ry="25" transform="rotate(28 105 74)"/>
        <ellipse fill="#F5C400" cx="82" cy="122" rx="33" ry="43"/>
        <g clipPath="url(#lc)">
          <rect fill="#1A1A1A" x="50" y="108" width="64" height="11"/>
          <rect fill="#1A1A1A" x="50" y="125" width="64" height="10"/>
          <rect fill="#1A1A1A" x="50" y="141" width="64" height="10"/>
          <rect fill="#1A1A1A" x="50" y="156" width="64" height="8"/>
        </g>
        <path fill="#1A1A1A" d="M75 160 Q82 180 89 160 Q82 156 75 160 Z"/>
        <circle fill="#F5C400" cx="82" cy="74" r="23"/>
        <circle fill="#1A1A1A" cx="73" cy="71" r="4.5"/>
        <circle fill="white" cx="71.5" cy="69.5" r="1.5"/>
        <circle fill="#1A1A1A" cx="91" cy="71" r="4.5"/>
        <circle fill="white" cx="89.5" cy="69.5" r="1.5"/>
        <path d="M73 81 Q82 90 91 81" stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="round" d="M72 53 Q66 38 61 28"/>
        <circle fill="#1A1A1A" cx="61" cy="28" r="3.5"/>
        <path stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="round" d="M92 53 Q98 38 103 28"/>
        <circle fill="#1A1A1A" cx="103" cy="28" r="3.5"/>
        <polygon fill="#F5C400" stroke="#1A1A1A" strokeWidth="1.8" strokeLinejoin="round" points="60,60 60,47 70,55 82,42 94,55 104,47 104,60"/>
        <circle fill="#1A1A1A" cx="70" cy="55" r="2"/>
        <circle fill="#1A1A1A" cx="94" cy="55" r="2"/>
      </g>
    </svg>
  );
}

// ── HEADER ────────────────────────────────────────────────────────────────────
export function Header({ dyslexie, setDyslexie, font }) {
  return (
    <header style={{
      background: C.wit, borderBottom: `2px solid ${C.rand}`,
      padding: "12px 24px", display: "flex", alignItems: "center",
      justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Logo size={36} />
        <div>
          <span style={{ fontFamily: font, fontWeight: 800, fontSize: 18, color: C.zwart }}>
            spelling<span style={{ color: C.geel }}>bij</span>
          </span>
          <span style={{ fontFamily: font, fontSize: 11, color: C.grijs, display: "block", marginTop: -2 }}>
            groep 3 · 4 · 5
          </span>
        </div>
      </div>
      <button onClick={() => setDyslexie(!dyslexie)} style={{
        background: dyslexie ? C.geel : C.cremeMid,
        border: `2px solid ${dyslexie ? "#D4A800" : C.rand}`,
        borderRadius: 20, padding: "6px 14px", cursor: "pointer",
        fontFamily: font, fontWeight: 700, fontSize: 12,
        color: C.zwart, display: "flex", alignItems: "center", gap: 6,
        transition: "all 0.2s",
      }}>
        <span style={{ fontSize: 14 }}>👁</span>
        Dyslexie{dyslexie ? " aan" : " uit"}
      </button>
    </header>
  );
}

// ── VOORTGANGSBALK ────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, kleur }) {
  return (
    <div style={{ background: C.rand, borderRadius: 99, height: 10, width: "100%", overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 99, background: kleur,
        width: `${Math.round((value/max)*100)}%`, transition: "width 0.4s ease" }} />
    </div>
  );
}

export function GroepBadge({ groep, kleur, font }) {
  return (
    <span style={{ background: kleur + "22", color: kleur, border: `1.5px solid ${kleur}44`,
      borderRadius: 99, padding: "2px 12px", fontSize: 12, fontWeight: 700, fontFamily: font }}>
      Groep {groep}
    </span>
  );
}

// ── KAART WRAPPER ─────────────────────────────────────────────────────────────
export function Kaart({ children, style }) {
  return (
    <div style={{ background: C.wit, borderRadius: 20, padding: "28px 24px",
      boxShadow: "0 2px 20px rgba(0,0,0,0.06)", border: `1px solid ${C.rand}`,
      marginBottom: 16, ...style }}>
      {children}
    </div>
  );
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
export function Footer({ font }) {
  return (
    <footer style={{ textAlign: "center", padding: "24px 16px", borderTop: `1px solid ${C.rand}`, marginTop: 24 }}>
      <p style={{ fontFamily: font, fontSize: 12, color: C.grijs }}>
        spellingbij · je voortgang blijft op dit apparaat
      </p>
    </footer>
  );
}
