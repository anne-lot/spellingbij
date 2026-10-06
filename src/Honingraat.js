import { useEffect, useState } from "react";
import { C } from "./theme";

// ── HONINGRAAT ────────────────────────────────────────────────────────────────
// Visuele voortgang voor "Zelf doen": één zeshoek per item.
//
//   fase="maken"  — tijdens de ronde: een zeshoek is leeg (nog niet gedaan),
//                   zacht neutraal gevuld (beantwoord, ongeacht goed/fout) of
//                   duidelijk gemarkeerd (de huidige). Geen enkele kleur
//                   verraadt of een antwoord goed was.
//   fase="klaar"  — na de ronde: goede antwoorden vullen zich, zeshoek voor
//                   zeshoek, met honinggeel (C.geel) én een vinkje (niet
//                   alleen kleur — zie toegankelijkheidseis). De rest blijft
//                   zacht en leeg: geen rood, geen kruis.
//
// `antwoorden`: array met lengte `aantal`, waarden null (nog niet gedaan),
// true (goed) of false (fout). `huidigIndex` is alleen relevant in fase
// "maken".
// ─────────────────────────────────────────────────────────────────────────────

const CEL_BREEDTE = 22;
const CEL_HOOGTE = 25;
const CEL_RADIUS = 11;

// Vertices van een zeshoek met de punt naar boven, zodat cellen in een rij
// mooi tegen elkaar aan sluiten.
function hexPunten(cx, cy, r) {
  const punten = [];
  for (let i = 0; i < 6; i++) {
    const hoek = (Math.PI / 180) * (60 * i - 90);
    punten.push(`${(cx + r * Math.cos(hoek)).toFixed(2)},${(cy + r * Math.sin(hoek)).toFixed(2)}`);
  }
  return punten.join(" ");
}

const HEX_PUNTEN = hexPunten(CEL_BREEDTE / 2, CEL_HOOGTE / 2, CEL_RADIUS);

function Cel({ status, isHuidig }) {
  // status: "leeg" | "beantwoord" | "goed" | "overig"
  let fill = C.wit, stroke = C.rand, strokeWidth = 1.5;
  if (status === "beantwoord") { fill = C.cremeMid; stroke = C.rand; }
  if (status === "goed") { fill = C.geel; stroke = "#D4A800"; }
  if (status === "overig") { fill = C.wit; stroke = C.rand; }
  if (isHuidig) { stroke = C.geel; strokeWidth = 3; }

  return (
    <svg width={CEL_BREEDTE} height={CEL_HOOGTE} viewBox={`0 0 ${CEL_BREEDTE} ${CEL_HOOGTE}`}
      style={{ transition: "fill 0.4s ease, stroke 0.4s ease", flexShrink: 0 }}>
      <polygon points={HEX_PUNTEN} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      {/* Vinkje bij een goed antwoord: het resultaat hangt nooit alleen van kleur af. */}
      {status === "goed" && (
        <polyline points="7,13 10,16.5 16,8.5" fill="none" stroke={C.wit}
          strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default function Honingraat({ aantal, antwoorden, huidigIndex = -1, fase = "maken" }) {
  // Tijdens "klaar" onthullen we de uitkomst zeshoek voor zeshoek, niet alles
  // tegelijk — rustige animatie zoals gevraagd.
  const [onthuld, setOnthuld] = useState(fase === "maken" ? aantal : 0);

  useEffect(() => {
    if (fase !== "klaar") return;
    setOnthuld(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setOnthuld(i);
      if (i >= aantal) clearInterval(interval);
    }, 90);
    return () => clearInterval(interval);
  }, [fase, aantal]);

  return (
    <div
      role="img"
      aria-label={
        fase === "klaar"
          ? `${antwoorden.filter(Boolean).length} van de ${aantal} goed`
          : `${antwoorden.filter((a) => a != null).length} van de ${aantal} items gedaan`
      }
      style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center" }}
    >
      {Array.from({ length: aantal }, (_, i) => {
        const antwoord = antwoorden[i];
        let status = "leeg";
        if (fase === "maken") {
          status = antwoord != null ? "beantwoord" : "leeg";
        } else if (i < onthuld) {
          status = antwoord === true ? "goed" : "overig";
        }
        return <Cel key={i} status={status} isHuidig={fase === "maken" && i === huidigIndex} />;
      })}
    </div>
  );
}
