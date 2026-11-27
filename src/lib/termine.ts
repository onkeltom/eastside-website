// Termine mit Enddatum ("bis", JJJJ-MM-TT) verschwinden nach diesem Tag.
// Beim Build gefiltert; ein Skript in Base.astro entfernt im Browser zusätzlich,
// was seit dem letzten Build abgelaufen ist (Elemente mit data-bis).
import alle from '../data/termine.json';

export type Termin = { datum: string; titel: string; bis?: string };

export const heute = () => new Date().toISOString().slice(0, 10);
export const termine: Termin[] = (alle as Termin[]).filter((t) => !t.bis || t.bis >= heute());
