import { useState, useRef, useEffect } from "react";

// ── FONTS ─────────────────────────────────────────────────────────────────────
const FONT_LINK_NUNITO = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap";
const FONT_LINK_DYSLEXIC = "https://fonts.cdnfonts.com/css/opendyslexic";

// ── KLEUREN ───────────────────────────────────────────────────────────────────
const C = {
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
};

// ── DATA ──────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id:"klankzuiver",   groep:3, naam:"Klankzuivere woorden",       uitleg:"Je schrijft precies wat je hoort.",                                               kleur:C.blauw },
  { id:"medeklinkers",  groep:3, naam:"Medeklinkerclusters",         uitleg:"Sommige klanken schrijf je anders dan je hoort: -nk, -ng, -cht, schr-.",         kleur:C.blauw },
  { id:"aai_ooi_oei",   groep:4, naam:"aai / ooi / oei",             uitleg:"Hoor je een j-klank aan het eind? Dan schrijf je een i: aai, ooi, oei.",         kleur:"#B45309" },
  { id:"eer_oor_eur",   groep:4, naam:"eer / oor / eur",             uitleg:"De r verandert de klank ervóór. Hoor je een lange u voor r? Schrijf eu.",        kleur:"#B45309" },
  { id:"eeuw_ieuw",     groep:4, naam:"eeuw / ieuw / uw",            uitleg:"Vaste patronen: hoor je eeew → eeuw, hoor je ieww → ieuw.",                      kleur:"#B45309" },
  { id:"open_gesloten", groep:4, naam:"Open/gesloten lettergreep",   uitleg:"Lange klank → 1 klinker (ma-nen). Korte klank → dubbele medeklinker (man-nen).", kleur:"#B45309" },
  { id:"be_ge_ver",     groep:4, naam:"be- / ge- / ver-",            uitleg:"Hoor je bu-, gu-, vur- aan het begin? Schrijf be-, ge-, ver-.",                  kleur:"#B45309" },
  { id:"ei_ij",         groep:4, naam:"ei / ij (weetwoorden)",       uitleg:"Er is geen regel — deze woorden leer je uit je hoofd.",                          kleur:"#B45309" },
  { id:"sv_fv",         groep:5, naam:"s/z en f/v wisseling",        uitleg:"In het meervoud verandert soms de laatste letter: baas→bazen, kluif→kluiven.",   kleur:C.groen },
  { id:"verkleinwoord", groep:5, naam:"Verkleinwoorden",             uitleg:"Na p, t, k, f, s + korte klank gebruik je -je. Anders -tje of -pje.",            kleur:C.groen },
  { id:"ig_lijk",       groep:5, naam:"Eindstukken -ig / -lijk",     uitleg:"Klinkt als -ug of -luk, maar schrijf je -ig en -lijk.",                          kleur:C.groen },
];

const OEFENVRAGEN = {
  klankzuiver: [
    { type:"mc", v:"Welk woord is goed gespeld?", o:["kat","katt","kkat"], a:"kat" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["roos","rooss","rozz"], a:"roos" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["fiets","fiiets","fietz"], a:"fiets" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["stoel","stoeel","stoehl"], a:"stoel" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["lamp","lammp","llamp"], a:"lamp" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["hand","hannd","handt"], a:"hand" },
    { type:"mc", n:true, context:"Een 'blep' is een verzonnen dier.", v:"Welk woord is goed gespeld?", o:["blep","blepp","bllep"], a:"blep", uitleg:"Klankzuiver: schrijf precies wat je hoort." },
    { type:"mc", n:true, context:"Stel je voor: een 'trum'.", v:"Welk woord is goed gespeld?", o:["trum","trumm","ttrum"], a:"trum", uitleg:"Klankzuiver: schrijf wat je hoort, niets meer." },
  ],
  medeklinkers: [
    { type:"mc", v:"Welk woord is goed gespeld?", o:["bank","bangk","bannk"], a:"bank" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["licht","ligt","liecht"], a:"licht" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["schrift","srift","sgrift"], a:"schrift" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["ring","rng","ringg"], a:"ring" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["vlieg","vliech","vliek"], a:"vlieg" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["brug","brugk","brugh"], a:"brug" },
    { type:"mc", n:true, context:"Je hoort het woord 'vlonk'.", v:"Hoe schrijf je 'vlonk'?", o:["vlongk","vlonk","vllonk"], a:"vlonk", uitleg:"ng-klank voor k → schrijf nk. Net als 'bank', 'drank'." },
    { type:"mc", n:true, context:"Je hoort het woord 'schrop'.", v:"Hoe schrijf je 'schrop'?", o:["srop","schrop","skrop"], a:"schrop", uitleg:"schr- is een vaste cluster. Net als 'schrift', 'schroef'." },
  ],
  aai_ooi_oei: [
    { type:"mc", v:"Welk woord is goed gespeld?", o:["draai","draaj","draaij"], a:"draai" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["mooi","mooj","mooij"], a:"mooi" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["groei","groej","groeij"], a:"groei" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["hooi","hooj","hooij"], a:"hooi" },
    { type:"sorteren", v:"Sleep elk woord naar de juiste kolom", kolommen:["aai","ooi","oei"], woorden:[{w:"draai",k:"aai"},{w:"mooi",k:"ooi"},{w:"groei",k:"oei"},{w:"kraai",k:"aai"},{w:"kooi",k:"ooi"},{w:"bloei",k:"oei"}] },
    { type:"mc", n:true, context:"Een verzonnen woord: 'praai'.", v:"Hoe schrijf je 'praai'?", o:["praaj","praaij","praai"], a:"praai", uitleg:"aai eindigt altijd op i. Net als 'kraai', 'draai'." },
  ],
  eer_oor_eur: [
    { type:"mc", v:"Welk woord is goed gespeld?", o:["deur","dur","deuur"], a:"deur" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["kleur","klur","kleuur"], a:"kleur" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["voor","vour","voer"], a:"voor" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["meer","mier","mieer"], a:"meer" },
    { type:"mc", n:true, context:"Een verzonnen woord: 'bleur'.", v:"Hoe schrijf je 'bleur'?", o:["blur","bleur","blleur"], a:"bleur", uitleg:"Lange u voor r → eu. Net als 'kleur', 'deur'." },
    { type:"mc", n:true, context:"Een verzonnen woord: 'snoor'.", v:"Hoe schrijf je 'snoor'?", o:["snor","snoor","snoer"], a:"snoor", uitleg:"oo voor r blijft oo. Net als 'spoor', 'voor'." },
  ],
  eeuw_ieuw: [
    { type:"mc", v:"Welk woord is goed gespeld?", o:["nieuw","niew","nieeuw"], a:"nieuw" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["eeuw","euw","eeew"], a:"eeuw" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["meeuw","meuw","meeeuw"], a:"meeuw" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["pauw","paaw","pauuw"], a:"pauw" },
    { type:"mc", n:true, context:"Een verzonnen woord: 'fleeuw'.", v:"Hoe schrijf je 'fleeuw'?", o:["flleeuw","fleuw","fleeuw"], a:"fleeuw", uitleg:"eeew-klank → eeuw. Net als 'meeuw', 'leeuw'." },
  ],
  open_gesloten: [
    { type:"mc", v:"Eén boom, maar meer...?", o:["boomen","bomen","bommen"], a:"bomen" },
    { type:"mc", v:"Eén man, maar meer...?", o:["manen","mannen","mannnen"], a:"mannen" },
    { type:"mc", v:"Eén roos, maar meer...?", o:["roozen","rozen","rooszen"], a:"rozen" },
    { type:"mc", v:"Eén bal, maar meer...?", o:["balen","baalen","ballen"], a:"ballen" },
    { type:"mc", n:true, context:"Er bestaat een dier: de 'mup'.", v:"Er loopt één mup. Er lopen meer...?", o:["mupen","muppen","muupen"], a:"muppen", uitleg:"Korte u + p → dubbele p. Net als 'kop → koppen'." },
    { type:"mc", n:true, context:"Een verzonnen voorwerp: een 'batel'.", v:"Er is één batel. Er zijn meer...?", o:["batels","batelen","batellen"], a:"batellen", uitleg:"Korte a → dubbele l. Net als 'vatten', 'pakken'." },
  ],
  be_ge_ver: [
    { type:"mc", v:"Welk woord is goed gespeld?", o:["biloof","beloof","buloof"], a:"beloof" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["guluk","geluk","giluk"], a:"geluk" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["vurhaal","verhaal","virhaal"], a:"verhaal" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["buhang","behang","bihang"], a:"behang" },
    { type:"mc", n:true, context:"Je hoort 'gu-borteld'.", v:"Hoe schrijf je de eerste twee letters?", o:["gu-","gi-","ge-"], a:"ge-", uitleg:"Hoor je 'gu-'? Dan schrijf je ge-." },
    { type:"mc", n:true, context:"Je hoort 'bu-sloten'.", v:"Hoe schrijf je het?", o:["busloten","besloten","bisloten"], a:"besloten", uitleg:"Hoor je 'bu-'? Dan schrijf je be-." },
  ],
  ei_ij: [
    { type:"mc", v:"Welk woord is goed gespeld?", o:["rijden","reijden","reiden"], a:"rijden" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["klein","kleijn","klien"], a:"klein" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["trein","trijn","treijn"], a:"trein" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["wijn","wein","weijn"], a:"wijn" },
    { type:"sorteren", v:"ei of ij?", kolommen:["ei","ij"], woorden:[{w:"trein",k:"ei"},{w:"rijden",k:"ij"},{w:"klein",k:"ei"},{w:"blijven",k:"ij"},{w:"leiden",k:"ei"},{w:"mijn",k:"ij"}] },
  ],
  sv_fv: [
    { type:"mc", v:"Meervoud van 'baas'?", o:["bazen","baazen","basen"], a:"bazen" },
    { type:"mc", v:"Meervoud van 'kluif'?", o:["kluifen","kluiven","kluvien"], a:"kluiven" },
    { type:"mc", v:"Meervoud van 'huis'?", o:["huisen","huizen","huuizen"], a:"huizen" },
    { type:"mc", v:"Meervoud van 'brief'?", o:["briefen","brieven","briven"], a:"brieven" },
    { type:"mc", n:true, context:"Een verzonnen dier: de 'kloos'.", v:"Meervoud van 'kloos'?", o:["kloosen","kloozen","klosen"], a:"kloozen", uitleg:"s → z in meervoud. Net als 'baas → bazen'." },
    { type:"mc", n:true, context:"Een verzonnen voorwerp: een 'gruif'.", v:"Meervoud van 'gruif'?", o:["gruifen","gruiven","gruvien"], a:"gruiven", uitleg:"f → v in meervoud. Net als 'kluif → kluiven'." },
  ],
  verkleinwoord: [
    { type:"mc", v:"Verkleinwoord van 'boom'?", o:["boomje","boomsje","boompje"], a:"boompje" },
    { type:"mc", v:"Verkleinwoord van 'huis'?", o:["huisje","huitje","huizje"], a:"huisje" },
    { type:"mc", v:"Verkleinwoord van 'taart'?", o:["taartje","taartsje","taarje"], a:"taartje" },
    { type:"mc", v:"Verkleinwoord van 'kop'?", o:["kopje","kopsje","koopje"], a:"kopje" },
    { type:"mc", n:true, context:"Een verzonnen voorwerp: een 'gluf'.", v:"Verkleinwoord van 'gluf'?", o:["glufsje","glufje","gluftje"], a:"glufje", uitleg:"Na f gebruik je -je. Net als 'kluif → kluifje'." },
    { type:"mc", n:true, context:"Een verzonnen ding: een 'stroon'.", v:"Verkleinwoord van 'stroon'?", o:["stroontje","stroonje","stroonnje"], a:"stroontje", uitleg:"Na n + lange klinker → -tje. Net als 'maan → maantje'." },
  ],
  ig_lijk: [
    { type:"mc", v:"Welk woord is goed gespeld?", o:["handug","handich","handig"], a:"handig" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["vroluk","vrolijk","vrolick"], a:"vrolijk" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["rustig","rustug","rustich"], a:"rustig" },
    { type:"mc", v:"Welk woord is goed gespeld?", o:["duideluk","duidelijk","duidelik"], a:"duidelijk" },
    { type:"mc", n:true, context:"Iemand die veel 'prulft' is erg...", v:"Hoe schrijf je dat?", o:["prulfug","prulfich","prulfig"], a:"prulfig", uitleg:"-ig, altijd. Net als 'handig', 'rustig'." },
    { type:"mc", n:true, context:"Iets dat 'blonderlijk' is.", v:"Welke uitgang is goed?", o:["blonderluk","blonderlik","blonderlijk"], a:"blonderlijk", uitleg:"-lijk, altijd. Net als 'vrolijk', 'duidelijk'." },
  ],
};

const DIAGNOSE_VRAGEN = {
  klankzuiver:   [{ v:"Welk woord is goed gespeld?", o:["kat","katt","kkat"], a:"kat" },{ v:"Welk woord is goed gespeld?", o:["lamp","lammp","llamp"], a:"lamp" },{ n:true, context:"Een 'blep' is een verzonnen dier.", v:"Welk woord is goed gespeld?", o:["blep","blepp","bllep"], a:"blep", uitleg:"Klankzuiver: schrijf precies wat je hoort." }],
  medeklinkers:  [{ v:"Welk woord is goed gespeld?", o:["bank","bangk","bannk"], a:"bank" },{ v:"Welk woord is goed gespeld?", o:["licht","ligt","liecht"], a:"licht" },{ n:true, context:"Je hoort het woord 'vlonk'.", v:"Hoe schrijf je 'vlonk'?", o:["vlongk","vlonk","vllonk"], a:"vlonk", uitleg:"ng-klank voor k → nk." }],
  aai_ooi_oei:   [{ v:"Welk woord is goed gespeld?", o:["draai","draaj","draaij"], a:"draai" },{ v:"Welk woord is goed gespeld?", o:["mooi","mooj","mooij"], a:"mooi" },{ n:true, context:"Een verzonnen woord: 'praai'.", v:"Hoe schrijf je 'praai'?", o:["praaj","praaij","praai"], a:"praai", uitleg:"aai eindigt op i." }],
  eer_oor_eur:   [{ v:"Welk woord is goed gespeld?", o:["deur","dur","deuur"], a:"deur" },{ v:"Welk woord is goed gespeld?", o:["voor","vour","voer"], a:"voor" },{ n:true, context:"Een verzonnen woord: 'bleur'.", v:"Hoe schrijf je 'bleur'?", o:["blur","bleur","blleur"], a:"bleur", uitleg:"Lange u voor r → eu." }],
  eeuw_ieuw:     [{ v:"Welk woord is goed gespeld?", o:["nieuw","niew","nieeuw"], a:"nieuw" },{ v:"Welk woord is goed gespeld?", o:["eeuw","euw","eeew"], a:"eeuw" },{ n:true, context:"Een verzonnen woord: 'fleeuw'.", v:"Hoe schrijf je 'fleeuw'?", o:["fleuw","fleeuw","flleuw"], a:"fleeuw", uitleg:"eeew → eeuw." }],
  open_gesloten: [{ v:"Eén man, maar meer...?", o:["manen","mannen","mannnen"], a:"mannen" },{ v:"Eén boom, maar meer...?", o:["boomen","bomen","bommen"], a:"bomen" },{ n:true, context:"Er bestaat een dier: de 'mup'.", v:"Er loopt één mup. Er lopen meer...?", o:["mupen","muppen","muupen"], a:"muppen", uitleg:"Korte u + p → dubbele p." }],
  be_ge_ver:     [{ v:"Welk woord is goed gespeld?", o:["biloof","beloof","buloof"], a:"beloof" },{ v:"Welk woord is goed gespeld?", o:["guluk","geluk","giluk"], a:"geluk" },{ n:true, context:"Je hoort 'gu-borteld'.", v:"Hoe schrijf je de eerste twee letters?", o:["gu-","gi-","ge-"], a:"ge-", uitleg:"Hoor je 'gu-'? Dan schrijf je ge-." }],
  ei_ij:         [{ v:"Welk woord is goed gespeld?", o:["rijden","reijden","reiden"], a:"rijden" },{ v:"Welk woord is goed gespeld?", o:["trein","trijn","treijn"], a:"trein" },{ v:"Welk woord is goed gespeld?", o:["klein","kleijn","klien"], a:"klein" }],
  sv_fv:         [{ v:"Meervoud van 'baas'?", o:["bazen","baazen","basen"], a:"bazen" },{ v:"Meervoud van 'kluif'?", o:["kluifen","kluiven","kluvien"], a:"kluiven" },{ n:true, context:"Een verzonnen dier: de 'kloos'.", v:"Meervoud van 'kloos'?", o:["kloosen","kloozen","klosen"], a:"kloozen", uitleg:"s → z in meervoud." }],
  verkleinwoord: [{ v:"Verkleinwoord van 'boom'?", o:["boomje","boomsje","boompje"], a:"boompje" },{ v:"Verkleinwoord van 'taart'?", o:["taartje","taartsje","taarje"], a:"taartje" },{ n:true, context:"Een verzonnen ding: een 'gluf'.", v:"Verkleinwoord van 'gluf'?", o:["glufsje","glufje","gluftje"], a:"glufje", uitleg:"Na f gebruik je -je." }],
  ig_lijk:       [{ v:"Welk woord is goed gespeld?", o:["handug","handich","handig"], a:"handig" },{ v:"Welk woord is goed gespeld?", o:["vroluk","vrolijk","vrolick"], a:"vrolijk" },{ n:true, context:"Iemand die veel 'prulft' is erg...", v:"Hoe schrijf je dat?", o:["prulfug","prulfich","prulfig"], a:"prulfig", uitleg:"-ig, altijd." }],
};

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ── LOGO SVG ──────────────────────────────────────────────────────────────────
function Logo({ size = 40 }) {
  const s = size / 200;
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
function Header({ dyslexie, setDyslexie, font }) {
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
function ProgressBar({ value, max, kleur }) {
  return (
    <div style={{ background: C.rand, borderRadius: 99, height: 10, width: "100%", overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 99, background: kleur,
        width: `${Math.round((value/max)*100)}%`, transition: "width 0.4s ease" }} />
    </div>
  );
}

function GroepBadge({ groep, kleur, font }) {
  return (
    <span style={{ background: kleur + "22", color: kleur, border: `1.5px solid ${kleur}44`,
      borderRadius: 99, padding: "2px 12px", fontSize: 12, fontWeight: 700, fontFamily: font }}>
      Groep {groep}
    </span>
  );
}

function NonsensBadge({ font }) {
  return (
    <span style={{ background: "#FFF9DC", color: "#92400E", border: `1.5px solid ${C.geel}`,
      borderRadius: 99, padding: "2px 12px", fontSize: 11, fontWeight: 700, fontFamily: font, marginLeft: 8 }}>
      ✦ nonsenswoord
    </span>
  );
}

// ── MEERKEUZE ─────────────────────────────────────────────────────────────────
function MeerKeuze({ vraag, onAnswer, font, dyslexie }) {
  const [gekozen, setGekozen] = useState(null);
  const opties = useRef(shuffle(vraag.o));
  function kies(opt) {
    if (gekozen) return;
    setGekozen(opt);
    setTimeout(() => onAnswer(opt === vraag.a), 800);
  }
  const fs = dyslexie ? 18 : 16;
  return (
    <div>
      {vraag.context && (
        <div style={{ background: C.geelLicht, borderRadius: 10, padding: "10px 14px",
          marginBottom: 14, borderLeft: `3px solid ${C.geel}` }}>
          <p style={{ color: "#92400E", fontSize: dyslexie ? 15 : 13, margin: 0,
            fontStyle: "italic", fontFamily: font }}>{vraag.context}</p>
        </div>
      )}
      <p style={{ fontWeight: 700, color: C.zwart, fontSize: dyslexie ? 20 : 17,
        marginBottom: 16, lineHeight: dyslexie ? 1.8 : 1.4, fontFamily: font }}>{vraag.v}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {opties.current.map(opt => {
          const isGoed = gekozen && opt === vraag.a;
          const isFout = gekozen === opt && opt !== vraag.a;
          return (
            <button key={opt} onClick={() => kies(opt)} style={{
              background: isGoed ? C.groenLicht : isFout ? C.roodLicht : C.wit,
              border: `2px solid ${isGoed ? C.groen : isFout ? C.rood : C.rand}`,
              borderRadius: 12, padding: "12px 18px", textAlign: "left",
              fontWeight: 600, fontSize: fs, cursor: gekozen ? "default" : "pointer",
              color: isGoed ? C.groen : isFout ? C.rood : C.zwart,
              fontFamily: font, transition: "all 0.15s", lineHeight: dyslexie ? 1.6 : 1.3,
            }}>
              {opt} {isGoed && "✓"} {isFout && "✗"}
            </button>
          );
        })}
      </div>
      {gekozen && vraag.uitleg && (
        <div style={{ marginTop: 14, background: C.groenLicht, borderRadius: 10,
          padding: "10px 14px", borderLeft: `3px solid ${C.groen}` }}>
          <p style={{ color: C.groen, fontSize: dyslexie ? 15 : 13, margin: 0, fontFamily: font }}>
            💡 {vraag.uitleg}
          </p>
        </div>
      )}
    </div>
  );
}

// ── SORTEREN ──────────────────────────────────────────────────────────────────
function SorteerOefening({ vraag, onAnswer, font, dyslexie }) {
  const [geplaatst, setGeplaatst] = useState({});
  const [klaar, setKlaar] = useState(false);
  const [score, setScore] = useState(null);
  const woorden = useRef(shuffle(vraag.woorden));
  function controleer() {
    if (Object.keys(geplaatst).length < vraag.woorden.length) return;
    const goed = vraag.woorden.filter(w => geplaatst[w.w] === w.k).length;
    setScore(goed); setKlaar(true);
    setTimeout(() => onAnswer(goed >= Math.ceil(vraag.woorden.length * 0.8)), 1200);
  }
  const ongeplaatst = woorden.current.filter(w => !geplaatst[w.w]);
  return (
    <div>
      <p style={{ fontWeight: 700, marginBottom: 12, color: C.zwart,
        fontSize: dyslexie ? 18 : 16, fontFamily: font }}>{vraag.v}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, minHeight: 36 }}>
        {ongeplaatst.map(w => (
          <span key={w.w} style={{ background: C.cremeMid, border: `2px dashed ${C.rand}`,
            borderRadius: 8, padding: "5px 12px", fontSize: dyslexie ? 16 : 14,
            fontWeight: 700, color: C.zwart, fontFamily: font }}>{w.w}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {vraag.kolommen.map(k => (
          <div key={k} style={{ flex: 1, background: C.cremeMid, border: `2px solid ${C.rand}`,
            borderRadius: 10, padding: 10, minHeight: 70 }}>
            <div style={{ fontWeight: 700, color: C.grijs, fontSize: 12, marginBottom: 6,
              textTransform: "uppercase", letterSpacing: 1, fontFamily: font }}>{k}</div>
            {Object.entries(geplaatst).filter(([,v]) => v === k).map(([w]) => {
              const correct = klaar && vraag.woorden.find(x => x.w === w)?.k === k;
              return (
                <div key={w} style={{ background: klaar ? (correct ? C.groenLicht : C.roodLicht) : C.geelLicht,
                  color: klaar ? (correct ? C.groen : C.rood) : "#92400E",
                  borderRadius: 6, padding: "3px 8px", marginBottom: 3,
                  fontSize: dyslexie ? 15 : 13, fontWeight: 700, fontFamily: font }}>
                  {w} {klaar && (correct ? "✓" : "✗")}
                </div>
              );
            })}
            {!klaar && ongeplaatst.map(w => (
              <button key={w.w} onClick={() => setGeplaatst(p => ({ ...p, [w.w]: k }))} style={{
                background: C.wit, border: `1.5px dashed ${C.geel}`, borderRadius: 6,
                padding: "2px 8px", fontSize: 11, cursor: "pointer",
                color: "#92400E", margin: "2px 2px 0 0", fontFamily: font }}>
                + {w.w}
              </button>
            ))}
          </div>
        ))}
      </div>
      {!klaar && (
        <button onClick={controleer}
          disabled={Object.keys(geplaatst).length < vraag.woorden.length}
          style={{ background: C.zwart, color: C.geel, border: "none", borderRadius: 10,
            padding: "10px 22px", fontWeight: 800, fontSize: 14, cursor: "pointer",
            opacity: Object.keys(geplaatst).length < vraag.woorden.length ? 0.4 : 1,
            fontFamily: font }}>Controleer</button>
      )}
      {klaar && score !== null && (
        <p style={{ fontWeight: 700, color: score >= Math.ceil(vraag.woorden.length * 0.8) ? C.groen : C.rood,
          fontSize: 14, marginTop: 8, fontFamily: font }}>{score} van {vraag.woorden.length} goed!</p>
      )}
    </div>
  );
}

// ── KAART WRAPPER ─────────────────────────────────────────────────────────────
function Kaart({ children, style }) {
  return (
    <div style={{ background: C.wit, borderRadius: 20, padding: "28px 24px",
      boxShadow: "0 2px 20px rgba(0,0,0,0.06)", border: `1px solid ${C.rand}`,
      marginBottom: 16, ...style }}>
      {children}
    </div>
  );
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function Footer({ font }) {
  return (
    <footer style={{ textAlign: "center", padding: "24px 16px", borderTop: `1px solid ${C.rand}`, marginTop: 24 }}>
      <p style={{ fontFamily: font, fontSize: 12, color: C.grijs }}>
        spellingbij.nl · <a href="/privacy" style={{ color: C.grijs }}>Privacy</a>
      </p>
    </footer>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
const FASE = { HOME:"home", DIAGNOSE:"diagnose", UITSLAG:"uitslag", OEFENEN:"oefenen", KLAAR:"klaar" };

export default function SpellingApp() {
  const [fase, setFase] = useState(FASE.HOME);
  const [dyslexie, setDyslexie] = useState(false);
  const [catIdx, setCatIdx] = useState(0);
  const [diagnoseScore, setDiagnoseScore] = useState({});
  const [teOefenen, setTeOefenen] = useState([]);
  const [oefenIdx, setOefenIdx] = useState(0);
  const [vraagIdx, setVraagIdx] = useState(0);
  const [oefenScore, setOefenScore] = useState({});
  const [diagnoseAntw, setDiagnoseAntw] = useState([]);

  const font = dyslexie ? "OpenDyslexic, sans-serif" : "'Nunito', sans-serif";

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = FONT_LINK_NUNITO;
    document.head.appendChild(link);
    const link2 = document.createElement("link");
    link2.rel = "stylesheet"; link2.href = FONT_LINK_DYSLEXIC;
    document.head.appendChild(link2);
  }, []);

  const pageStyle = {
    minHeight: "100vh", background: C.creme,
    fontFamily: font, transition: "font-family 0.2s",
  };

  // ── HOME ──
  if (fase === FASE.HOME) return (
    <div style={pageStyle}>
      <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Logo size={80} />
          <h1 style={{ fontFamily: font, fontWeight: 800, fontSize: 32, color: C.zwart, margin: "16px 0 8px" }}>
            Leer spelling <span style={{ color: C.geel }}>stap voor stap</span>
          </h1>
          <p style={{ fontFamily: font, color: C.grijs, fontSize: 16, lineHeight: 1.6, margin: "0 0 8px" }}>
            De app test eerst wat je al weet. Daarna oefen je alleen wat je nog niet kent.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
            background: C.geelLicht, borderRadius: 12, padding: "8px 16px", border: `1px solid ${C.geel}` }}>
            <span style={{ fontSize: 14 }}>✦</span>
            <span style={{ fontFamily: font, fontSize: 13, color: "#92400E", fontWeight: 600 }}>
              Met nonsenswoorden — om te zien of je de regel echt snapt
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {[3,4,5].map(g => {
            const cats = CATEGORIES.filter(c => c.groep === g);
            const kleur = cats[0].kleur;
            return (
              <div key={g} style={{ background: C.wit, border: `1.5px solid ${C.rand}`,
                borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: kleur + "22", borderRadius: 10, padding: "8px 14px",
                  fontWeight: 800, fontSize: 15, color: kleur, fontFamily: font, whiteSpace: "nowrap" }}>
                  Groep {g}
                </div>
                <span style={{ fontFamily: font, fontSize: 13, color: C.grijs }}>
                  {cats.map(c => c.naam).join(" · ")}
                </span>
              </div>
            );
          })}
        </div>

        <button onClick={() => setFase(FASE.DIAGNOSE)} style={{
          background: C.zwart, color: C.geel, border: "none", borderRadius: 16,
          padding: "16px 36px", fontWeight: 800, fontSize: 18, cursor: "pointer",
          width: "100%", fontFamily: font, letterSpacing: 0.3,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)", transition: "transform 0.1s",
        }}>
          Start diagnosetoets →
        </button>
      </div>
      <Footer font={font} />
    </div>
  );

  // ── DIAGNOSE ──
  if (fase === FASE.DIAGNOSE) {
    const cat = CATEGORIES[catIdx];
    const vragen = DIAGNOSE_VRAGEN[cat.id] || [];
    const huidigeVraag = vragen[diagnoseAntw.length];

    function verwerkDiagnose(goed) {
      const nieuweAntw = [...diagnoseAntw, goed];
      setDiagnoseAntw(nieuweAntw);
      if (nieuweAntw.length >= vragen.length) {
        const score = nieuweAntw.filter(Boolean).length;
        const nieuweScores = { ...diagnoseScore, [cat.id]: score };
        setDiagnoseScore(nieuweScores);
        setDiagnoseAntw([]);
        if (catIdx + 1 >= CATEGORIES.length) {
          const teOef = CATEGORIES.filter(c => (nieuweScores[c.id]||0) < 3).map(c => c.id);
          setTeOefenen(teOef);
          setFase(FASE.UITSLAG);
        } else { setCatIdx(catIdx + 1); }
      }
    }

    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: font, fontWeight: 700, color: C.grijs, fontSize: 13 }}>
                Diagnosetoets · {catIdx+1}/{CATEGORIES.length}
              </span>
              <GroepBadge groep={cat.groep} kleur={cat.kleur} font={font} />
            </div>
            <ProgressBar value={catIdx+(diagnoseAntw.length/Math.max(vragen.length,1))} max={CATEGORIES.length} kleur={cat.kleur} />
          </div>
          <Kaart>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 6 }}>
              <span style={{ background: cat.kleur+"22", borderRadius: 8, padding: "4px 12px",
                fontWeight: 700, color: cat.kleur, fontSize: 14, fontFamily: font }}>{cat.naam}</span>
              {huidigeVraag?.n && <NonsensBadge font={font} />}
            </div>
            <div style={{ background: C.geelLicht, borderRadius: 10, padding: "10px 14px", marginBottom: 20, borderLeft: `3px solid ${C.geel}` }}>
              <p style={{ color: "#92400E", fontSize: dyslexie ? 14 : 12, margin: 0, fontFamily: font }}>💡 {cat.uitleg}</p>
            </div>
            {huidigeVraag && (
              huidigeVraag.type === "sorteren"
                ? <SorteerOefening vraag={huidigeVraag} onAnswer={verwerkDiagnose} font={font} dyslexie={dyslexie} key={`d-${cat.id}-${diagnoseAntw.length}`} />
                : <MeerKeuze vraag={huidigeVraag} onAnswer={verwerkDiagnose} font={font} dyslexie={dyslexie} key={`d-${cat.id}-${diagnoseAntw.length}`} />
            )}
          </Kaart>
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {vragen.map((_,i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 99,
              background: i < diagnoseAntw.length ? cat.kleur : C.rand }} />)}
          </div>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  // ── UITSLAG ──
  if (fase === FASE.UITSLAG) {
    const goed = CATEGORIES.filter(c => (diagnoseScore[c.id]||0) >= 3);
    const bijspijkeren = CATEGORIES.filter(c => (diagnoseScore[c.id]||0) < 3);
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
          <Kaart>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>{bijspijkeren.length===0?"🏆":bijspijkeren.length<4?"👍":"💪"}</div>
              <h2 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.zwart, margin: "0 0 6px" }}>Diagnose klaar!</h2>
              <p style={{ fontFamily: font, color: C.grijs, fontSize: 14 }}>{goed.length} van {CATEGORIES.length} onderdelen al goed</p>
            </div>
            {goed.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: font, fontWeight: 700, color: C.groen, fontSize: 13, marginBottom: 8 }}>✓ Al goed</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {goed.map(c => <span key={c.id} style={{ background: C.groenLicht, color: C.groen,
                    border: `1.5px solid ${C.groen}44`, borderRadius: 99, padding: "2px 12px",
                    fontSize: 12, fontWeight: 700, fontFamily: font }}>{c.naam}</span>)}
                </div>
              </div>
            )}
            {bijspijkeren.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontFamily: font, fontWeight: 700, color: "#92400E", fontSize: 13, marginBottom: 8 }}>→ Nog oefenen</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {bijspijkeren.map(c => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", background: C.geelLicht, borderRadius: 10, padding: "8px 12px",
                      border: `1px solid ${C.geel}44` }}>
                      <span style={{ fontFamily: font, fontWeight: 600, color: "#92400E", fontSize: 14 }}>{c.naam}</span>
                      <GroepBadge groep={c.groep} kleur={c.kleur} font={font} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => { if(bijspijkeren.length===0){setFase(FASE.KLAAR);return;} setOefenIdx(0);setVraagIdx(0);setFase(FASE.OEFENEN); }}
              style={{ background: C.zwart, color: C.geel, border: "none", borderRadius: 14,
                padding: "14px 36px", fontWeight: 800, fontSize: 16, cursor: "pointer",
                width: "100%", fontFamily: font }}>
              {bijspijkeren.length===0?"Klaar! 🎉":`Start oefenen (${bijspijkeren.length} onderdelen) →`}
            </button>
          </Kaart>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  // ── OEFENEN ──
  if (fase === FASE.OEFENEN) {
    const catId = teOefenen[oefenIdx];
    const cat = CATEGORIES.find(c => c.id === catId);
    const vragen = OEFENVRAGEN[catId] || [];
    const vraag = vragen[vraagIdx];

    function verwerkOefen(goed) {
      const huidig = oefenScore[catId] || { goed:0, totaal:0 };
      setOefenScore(prev => ({ ...prev, [catId]: { goed: huidig.goed+(goed?1:0), totaal: huidig.totaal+1 } }));
      if (vraagIdx+1 >= vragen.length) {
        if (oefenIdx+1 >= teOefenen.length) setFase(FASE.KLAAR);
        else { setOefenIdx(oefenIdx+1); setVraagIdx(0); }
      } else { setVraagIdx(vraagIdx+1); }
    }

    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: font, fontWeight: 700, color: C.grijs, fontSize: 13 }}>
                Oefenen · {oefenIdx+1}/{teOefenen.length}
              </span>
              <GroepBadge groep={cat.groep} kleur={cat.kleur} font={font} />
            </div>
            <ProgressBar value={oefenIdx+(vraagIdx/Math.max(vragen.length,1))} max={teOefenen.length} kleur={cat.kleur} />
          </div>
          <Kaart>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
              <span style={{ background: cat.kleur+"22", borderRadius: 8, padding: "4px 12px",
                fontWeight: 700, color: cat.kleur, fontSize: 14, fontFamily: font }}>{cat.naam}</span>
              {vraag?.n && <NonsensBadge font={font} />}
            </div>
            <div style={{ background: C.geelLicht, borderRadius: 10, padding: "10px 14px",
              marginBottom: 20, borderLeft: `3px solid ${C.geel}` }}>
              <p style={{ color: "#92400E", fontSize: dyslexie ? 14 : 12, margin: 0, fontFamily: font }}>
                💡 {cat.uitleg}
              </p>
            </div>
            {vraag && (
              vraag.type === "sorteren"
                ? <SorteerOefening vraag={vraag} onAnswer={verwerkOefen} font={font} dyslexie={dyslexie} key={`${catId}-${vraagIdx}`} />
                : <MeerKeuze vraag={vraag} onAnswer={verwerkOefen} font={font} dyslexie={dyslexie} key={`${catId}-${vraagIdx}`} />
            )}
          </Kaart>
          <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
            {vragen.map((_,i) => <div key={i} style={{ width: 8, height: 8, borderRadius: 99,
              background: i<vraagIdx?cat.kleur:i===vraagIdx?cat.kleur+"88":C.rand }} />)}
          </div>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  // ── KLAAR ──
  if (fase === FASE.KLAAR) {
    const totaalGoed = Object.values(oefenScore).reduce((s,v)=>s+v.goed,0);
    const totaalVragen = Object.values(oefenScore).reduce((s,v)=>s+v.totaal,0);
    const pct = totaalVragen>0 ? Math.round((totaalGoed/totaalVragen)*100) : 100;
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 16px" }}>
          <Kaart style={{ textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{pct>=80?"🏆":pct>=60?"⭐":"💪"}</div>
            <h2 style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: C.zwart, margin: "0 0 8px" }}>Goed gedaan!</h2>
            <div style={{ fontSize: 52, fontWeight: 900, color: C.geel, margin: "12px 0",
              textShadow: "0 2px 0 #D4A800", fontFamily: font }}>{pct}%</div>
            <p style={{ fontFamily: font, color: C.grijs, fontSize: 15, marginBottom: 28 }}>
              {totaalGoed} van {totaalVragen} oefenvragen goed
            </p>
            {Object.entries(oefenScore).length > 0 && (
              <div style={{ textAlign: "left", marginBottom: 28 }}>
                {Object.entries(oefenScore).map(([catId,s]) => {
                  const cat = CATEGORIES.find(c=>c.id===catId);
                  const p = Math.round((s.goed/s.totaal)*100);
                  return (
                    <div key={catId} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.zwart }}>{cat?.naam}</span>
                        <span style={{ fontFamily: font, fontSize: 13, color: p>=75?C.groen:C.rood, fontWeight: 700 }}>{p}%</span>
                      </div>
                      <ProgressBar value={s.goed} max={s.totaal} kleur={p>=75?C.groen:C.geel} />
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => { setFase(FASE.HOME);setCatIdx(0);setDiagnoseScore({});setTeOefenen([]);setOefenIdx(0);setVraagIdx(0);setOefenScore({});setDiagnoseAntw([]); }}
              style={{ background: C.zwart, color: C.geel, border: "none", borderRadius: 14,
                padding: "14px 36px", fontWeight: 800, fontSize: 16, cursor: "pointer",
                width: "100%", fontFamily: font }}>
              Opnieuw beginnen
            </button>
          </Kaart>
        </div>
        <Footer font={font} />
      </div>
    );
  }
  return null;
}