// Trainingssaison und Jahrgänge – gepflegt in src/data/verein.json („saison") und als Alter in
// src/data/gruppen.json bzw. stufen.json, überall daraus berechnet. Nichts davon von Hand nachtragen.
import verein from '../data/verein.json';

export type Saison = 'sommer' | 'winter';

const cfg = verein.saison;
const md = (s: string) => s.split('-').map(Number) as [number, number]; // "11-01" → [11, 1]
const start: Record<Saison, [number, number]> = { sommer: md(cfg.sommer_ab), winter: md(cfg.winter_ab) };
const andere = (s: Saison): Saison => (s === 'sommer' ? 'winter' : 'sommer');
const monat = (m: number, d: number, month: 'long' | 'short') =>
  new Date(2000, m - 1, d).toLocaleDateString('de-DE', { month });

/** Saison an einem Tag. Annahme: der Sommer beginnt im Kalenderjahr vor dem Winter (April vor November). */
export function saisonAm(d = new Date()): Saison {
  const t = (d.getMonth() + 1) * 100 + d.getDate();
  const [sm, sd] = start.sommer;
  const [wm, wd] = start.winter;
  return t >= sm * 100 + sd && t < wm * 100 + wd ? 'sommer' : 'winter';
}

/** Monate einer Saison, z. B. lang „April bis Oktober", strich „April–Oktober", kurz „Apr.–Okt.". */
export function saisonMonate(s: Saison) {
  const [m, d] = start[s];
  const [em, ed] = start[andere(s)];
  const ende = new Date(2000, em - 1, ed - 1); // Tag vor Beginn der anderen Saison
  const von = (f: 'long' | 'short') => monat(m, d, f);
  const bis = (f: 'long' | 'short') => monat(ende.getMonth() + 1, ende.getDate(), f);
  return { lang: `${von('long')} bis ${bis('long')}`, strich: `${von('long')}–${bis('long')}`, kurz: `${von('short')}–${bis('short')}` };
}

/** Nächster Saisonwechsel, wenn er höchstens `hinweis_tage_vorher` Tage entfernt ist – sonst null. */
export function naechsterWechsel(heute = new Date()) {
  const tag = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
  const s = andere(saisonAm(tag));
  const [m, d] = start[s];
  let datum = new Date(tag.getFullYear(), m - 1, d);
  if (datum < tag) datum = new Date(tag.getFullYear() + 1, m - 1, d);
  const tage = Math.round((datum.valueOf() - tag.valueOf()) / 86_400_000);
  if (tage > cfg.hinweis_tage_vorher) return null;
  return { saison: s, ab: `${d}. ${monat(m, d, 'long')}`, hinweis: s === 'sommer' ? cfg.hinweis_sommer : cfg.hinweis_winter };
}

// Altersklassen nach DLV: maßgeblich ist das Alter, das ein Kind im laufenden Kalenderjahr
// erreicht (Stichtag 1. Januar). U10 = Kinder, die in diesem Jahr 8 oder 9 werden.
/** Jahrgänge (aufsteigend) zu einem Altersbereich [von, bis]. */
export function jahrgaenge(alter: number[], jahr = new Date().getFullYear()): number[] {
  const [von, bis] = alter;
  return Array.from({ length: bis - von + 1 }, (_, i) => jahr - bis + i);
}

/** „2017–2018" für einen Altersbereich. */
export function jahrgangText(alter: number[], jahr?: number): string {
  const j = jahrgaenge(alter, jahr);
  return j.length === 1 ? String(j[0]) : `${j[0]}–${j[j.length - 1]}`;
}
