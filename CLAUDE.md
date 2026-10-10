# CLAUDE.md – EAST SIDE BERLIN e.V. Website

Kontext für Claude Code. Bitte vor jeder Änderung lesen.

## Worum es geht

Neubau der Website von **EAST SIDE BERLIN e.V.** (sc-eastside.de), einem jungen Leichtathletikverein für Kinder und Jugendliche im Berliner Osten (gegründet 21.12.2022). Ansprechpartner Projekt: Dominik (Haupteditor, technisch). Präsident und Cheftrainer: Dejvid Kolić.

Leitidee: **„EASTSIDE – dein Leichtathletikverein, in dem und mit dem du wachsen kannst."**
Werte: Talentförderung, Freude an Bewegung, offen für alle aus dem Kiez, die ein bisschen mehr wollen. Vielfalt ist Selbstverständnis, kein Schlagwort.

Die Website hat drei Aufgaben, in dieser Reihenfolge:
1. Eltern finden schnell die passende Gruppe und melden sich an (oder kommen auf die Warteliste).
2. Der Verein präsentiert sich gegenüber Politik, Förderern, Sponsoren und Presse – Erfolge sind dabei zentral.
3. Neue Trainer:innen gewinnen.

## Getroffene Entscheidungen

- **Designrichtung C („Familie")**: hell, klar, freundlich, runde Formen. Akzente aus der kräftigeren Richtung B nur bei Erfolgen (dunkle Flächen, Neongrün, Mono-Labels).
- **Startseite klassisch** (Trainer-Feedback): Hero-Foto mit Willkommen, News mit vielen Fotos, Termine, freie Plätze, Angebot, Erfolge-Band, Partner.
- **„Trainer:in werden"** ist eine eigene Seite, nur über das Hauptmenü erreichbar – kein Block am Ende der Startseite.
- **„Erfolg melden"** für Trainer:innen ist nur im Footer verlinkt.
- **Statische Website** (Astro), kein WordPress. Grund: wenig Wartung, Redesigns betreffen nur Vorlagen, nicht Inhalte.
- **Dominik ist einziger Haupteditor** mit GitHub-Zugang. Andere reichen über Formulare ein; Einreichungen werden als Entwurf (`draft: true`) im Repository abgelegt und von Dominik veröffentlicht.
- **Hosting**: Vorschau auf GitHub Pages (`.github/workflows/deploy.yml`). Livebetrieb geplant auf **Cloudflare Pages** (nicht Vercel Hobby – nur persönliche, nicht-kommerzielle Nutzung erlaubt). Domain sc-eastside.de bleibt beim Registrar, wird per DNS umgestellt (vorher prüfen, ob Mail-Records existieren).
- **Redaktionsbereich**: Sveltia CMS unter `/admin` (`public/admin/`). Login später über `sveltia-cms-auth` auf Cloudflare Workers. Nicht auf Netlify Identity / Git Gateway bauen (Git Gateway ist deprecated).
- **Automatisierung später, in Stufen**: (1) kleines Formular-Skript → Entwurf im Repo, (2) KI als Schreibhilfe für Entwürfe, (3) ggf. n8n mit KI-Baustein. Eine KI veröffentlicht nie selbst.

## Informationsarchitektur

Hauptmenü (fünf Punkte + Button „Probetraining anfragen" → Gruppenfinder):

| Menüpunkt | Seiten |
| --- | --- |
| Mitmachen | `/mitmachen/` Gruppenfinder + alle Zeiten + FAQ · `/mitmachen/dein-weg/` |
| Erfolge | `/erfolge/` · `/erfolge/melden/` (nur Footer) |
| News & Termine | `/news/` · `/news/<id>/` |
| Verein | `/verein/` (Über uns, Team, Beiträge, Partner & Sponsoren, Downloads) |
| Trainer:in werden | `/trainer/` |

Offen / noch zu gestalten: eigene Seiten für Beiträge & Mitgliedschaft, Sportcamps, Presse; echte Fotogalerien; Impressum und Datenschutz (Texte von der alten Seite übernehmen und prüfen lassen).

## Projektstruktur

- `src/layouts/Base.astro` – Kopf, Hauptmenü (mobil als `<details>`-Menü), Footer, Vorschau-Hinweis
- `src/styles/global.css` – gesamte Gestaltung, Design-Tokens in `:root`
- `src/lib/url.ts` – `url()` für alle internen Links (wegen Unterpfad auf GitHub Pages) – **immer verwenden, nie `/pfad` hart codieren**
- `src/content/news/*.md` – Beiträge (Schema in `src/content.config.ts`)
- `src/data/*.json` – Gruppen, Erfolge, Termine, Stufen/Trainerrollen, Vereinsdaten
- `public/admin/` – Sveltia CMS (Konfiguration noch ungetestet, v. a. JSON-Dateien mit `root: true`-Listen)

Eine Information wird **einmal** gepflegt und an mehreren Stellen angezeigt (z. B. Erfolg → Erfolge-Seite, Startseite, News). Keine Inhalte doppelt in Seiten abtippen, sondern aus `src/data` oder `src/content` lesen.

## Gestaltungsregeln

- Farben: Tinte `#16181a`, Flächen `#f3f5ec` / `#e6e9df`, Linien `#dfe3d6`, **Neongrün `#c8ff2e` sparsam** – für Aktionen, Status „Plätze frei", Highlights, nie als Fließtextfarbe auf Weiß.
- Schriften: Bricolage Grotesque (Überschriften), DM Sans (Text), JetBrains Mono (kleine Labels). **Lokal über @fontsource ausgeliefert – keine Google-Fonts-Links** (DSGVO).
- Mobil zuerst: Eltern nutzen vor allem das Handy. Kein horizontales Scrollen, Touch-Ziele ≥ 44 px.
- Ton: locker, direkt, ohne Kindchen-Sprache; Deutsch, gendern mit Doppelpunkt (Trainer:in).
- Altersgruppen werden nicht als eigene Marken getrennt; der Weg U8 → U10 → U12 → U14+ ergibt sich aus Inhalt und Bildern. Die Spaß-Gruppe ist ein gleichberechtigter eigener Zugang (Bewegung ohne Wettkampfehrgeiz).
- Volle Gruppen sind Normalfall, keine Sackgasse: immer Warteliste + Alternative + Hinweis „Trainer:in werden / Partner helfen".

## Feste Regeln

- **Keine echten Kindernamen oder Kinderfotos ohne dokumentierte Einwilligung der Eltern.** Ohne Einwilligung: „Athlet:in U12" oder Teamname. Solange das Repository öffentlich ist, gar keine echten Kinderdaten einchecken.
- **Keine erfundenen Fakten.** Fehlende Angaben bleiben als `[Platzhalter]` sichtbar. Belegte Zahlen bisher: Gründung 2022; Wettkämpfe laut LADV 2023: 2, 2024: 8, 2025: 14, 2026 bisher: 13 (Stand Sept. 2026). Trainingszeiten stammen von der alten Website.
- **Vorschau bleibt `noindex`** mit Hinweisbalken. Erst für den Livebetrieb `PREVIEW=false` setzen.
- Formulare sind noch nicht angeschlossen; Daten von Kindern/Eltern nur über Anbieter mit Servern in der EU und mit Datenschutzhinweis verarbeiten.

## Befehle

```bash
npm install
npm run dev                                   # lokal, http://localhost:4321
npm run build                                 # Ausgabe in dist/
BASE_PATH=/eastside-website npm run build     # wie auf GitHub Pages
```

Vor dem Commit: `npm run build` muss ohne Fehler laufen; neue Seiten auf 390 px Breite prüfen.

## Nächste Schritte

1. Vorschau auf GitHub Pages online bringen, Feedback von Dejvid und ersten Eltern einholen.
2. Echte Inhalte einpflegen: Erfolge (Datum, Wettkampf, Klasse, Disziplin, Platz), Fotos mit Einwilligung, Trainerprofile, Beiträge, Termine.
3. Redaktionsbereich aktivieren (sveltia-cms-auth auf Cloudflare Workers, `base_url` in `public/admin/config.yml`), Konfiguration testen.
4. Formular-Skript: Einreichungen (Erfolg melden, Beitrag, Änderung vorschlagen) → Entwurf bzw. Issue im Repository, Fotos verkleinern.
5. Offene Seiten: Beiträge & Mitgliedschaft, Camps, Presse; Impressum/Datenschutz.
6. Livebetrieb: Cloudflare Pages, DNS umstellen, `PREVIEW=false`.

## Referenzen

- Planungsdokument (Ziele, Zielgruppen, Sitemap, Warteliste, Erfolge, Sponsoren, Hosting): https://claude.ai/code/artifact/ca11aabb-e81e-4635-8d9c-92ffcbcb7a8e
- Design-Arbeitsfläche mit allen Entwürfen (Reihe „C" und „C · Startseite v2" sind maßgeblich): https://claude.ai/artifact/FHDX7aSVGPWk2ZhzckeR4X
- Alte Website: https://sc-eastside.de · LADV-Vereinsprofil: https://ladv.de/verein/detail/4720/BLC-Alt-Marzahn.htm
