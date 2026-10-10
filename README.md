# EAST SIDE BERLIN e.V. – neue Website

Statische Website mit [Astro](https://astro.build). Inhalte liegen als einfache Dateien im Repository und werden später über den Redaktionsbereich (`/admin`, Sveltia CMS) gepflegt.

Status: **erste Vorschau** zum Review durch Vorstand, Trainer:innen und erste Eltern. Texte in `[eckigen Klammern]` und Foto-Flächen sind Platzhalter.

## Vorschau auf GitHub Pages einschalten (einmalig)

1. Diesen Ordner ins Repository `onkeltom/eastside-website` hochladen (siehe unten).
2. Auf GitHub: **Settings → Pages → Build and deployment → Source: „GitHub Actions"** wählen.
3. Bei jedem Push auf `main` baut der Workflow `.github/workflows/deploy.yml` die Seite und veröffentlicht sie unter
   `https://onkeltom.github.io/eastside-website/`.

Hinweise zur Vorschau:
- Die Seite ist öffentlich, aber mit `noindex` markiert (keine Suchmaschinen) und trägt oben den Hinweis „Vorschau".
- Bei einem kostenlosen GitHub-Konto muss das Repository dafür öffentlich sein → **keine echten Kindernamen oder Fotos ohne Einwilligung** einchecken.
- Die Formulare (Probetraining, Erfolg melden, Trainer:in werden) senden in der Vorschau nichts.

## Hochladen

```bash
cd eastside-website
git init -b main
git add .
git commit -m "Erste Vorschau der neuen Vereinswebsite"
git remote add origin https://github.com/onkeltom/eastside-website.git
git push -u origin main
```

## Lokal ansehen

```bash
npm install
npm run dev        # http://localhost:4321
```

## Wo welche Inhalte liegen

| Inhalt | Datei | Erscheint auf |
| --- | --- | --- |
| News und Berichte | `src/content/news/*.md` (eine Datei pro Beitrag, `draft: true` = nicht veröffentlicht) | Startseite, News, Erfolge, Beitragsseite |
| Erfolge / Ergebnisse | `src/data/erfolge.json` | Erfolge-Seite |
| Gruppen, Zeiten, freie Plätze | `src/data/gruppen.json` | Startseite, Gruppenfinder |
| Termine | `src/data/termine.json` | Startseite, News |
| Stufen „Dein Weg" und Trainerrollen | `src/data/stufen.json` | Dein Weg, Trainer:in werden |
| Vereinsdaten, Wettkämpfe pro Jahr | `src/data/verein.json` | mehrere Seiten |
| Gestaltung | `src/styles/global.css` | überall |

## Seitenstruktur

- `/` Startseite (Willkommen, News mit Fotos, Termine, freie Plätze, Angebot, Erfolge, Partner)
- `/mitmachen/` Gruppenfinder mit Warteliste, alle Trainingszeiten, FAQ
- `/mitmachen/dein-weg/` Altersstufen U8 bis U14+, Spaß-Gruppe, Trainerrollen
- `/erfolge/` Berichte, Ergebnisse (filterbar), Wettkämpfe pro Jahr, Porträts
- `/erfolge/melden/` Meldeformular für Trainer:innen (nur im Footer verlinkt)
- `/news/` und `/news/<beitrag>/` Beiträge mit Fotogalerie, Termine
- `/verein/` Über uns, Team, Beiträge, Partner & Sponsoren, Downloads
- `/trainer/` Trainer:in werden
- `/impressum/`, `/datenschutz/` (Texte folgen)

## Nächste Schritte (siehe Planungsdokument)

- Echte Fotos (mit Einwilligung), Texte und Erfolge eintragen
- Redaktionsbereich `/admin` aktivieren: GitHub-Login-Helfer `sveltia-cms-auth` auf Cloudflare Workers einrichten und in `public/admin/config.yml` als `base_url` eintragen (Konfiguration noch ungetestet)
- Formulare anschließen (Einreichungen landen als Entwurf im Repository)
- Livebetrieb auf Cloudflare Pages, Domain sc-eastside.de per DNS umstellen, dann `PREVIEW=false` setzen
- Schriften werden lokal ausgeliefert (keine Google-Fonts-Abrufe)
