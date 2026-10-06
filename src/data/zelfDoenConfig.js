// ── ITEMVORM VOOR "ZELF DOEN" ─────────────────────────────────────────────────
// Eén plek om later te wisselen van itemvorm, zonder de rest van ZelfDoen.js
// aan te raken. Nu is alleen "dicteewoord" gebouwd (zoals gevraagd: beginnen
// met (a)); de andere twee staan hier als vaste namen klaar zodat een latere
// uitbreiding niet overal losse stringconstanten verzint.
//
//   dicteewoord      : het woord wordt kort getoond en verdwijnt, het kind
//                      typt het uit het geheugen over (huidige implementatie
//                      van "dicteren" — de app heeft geen audio, dit is het
//                      bestaande vervangingsmechanisme uit Flitswoorden/
//                      CategorieOefenen).
//   zinsgat          : een zin met een gat, het kind typt het ontbrekende
//                      woord. (nog niet gebouwd)
//   kiesTweeWoorden  : twee schrijfwijzen, het kind kiest de juiste.
//                      (nog niet gebouwd)
//
// ZelfDoen.js valt terug op "dicteewoord" als deze waarde iets anders is, met
// een console.warn — een verkeerde config mag de app nooit laten crashen.
export const ITEMVORM = "dicteewoord";

export const ITEMVORMEN = {
  DICTEEWOORD: "dicteewoord",
  ZINSGAT: "zinsgat",
  KIES_TWEE_WOORDEN: "kiesTweeWoorden",
};
