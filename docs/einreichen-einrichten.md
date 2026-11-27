# Berichte einreichen: Einrichtung

Trainer:innen schreiben unter `/einreichen/` einen Bericht und laden Fotos hoch. Sie melden sich mit einem Code per E-Mail an, ein GitHub-Konto brauchen sie nicht.

## So läuft es

1. Trainer:in öffnet `/einreichen/`. Cloudflare Access fragt nach der E-Mail-Adresse und schickt einen Code.
2. Der Browser verkleinert die Fotos auf höchstens 2000 px und entfernt dabei Standortdaten.
3. `functions/api/bericht.js` legt die Fotos im **privaten** R2-Bucket `eastside-fotos` ab (`news/<datei>/01.jpg` …). Wer die Einwilligung bestätigt hat, steht in den Metadaten des Fotos, nicht im öffentlichen Repository.
4. Der Text kommt als Pull Request ins Repository (Zweig `bericht/<datei>`). Cloudflare baut dafür eine Vorschau-Version.
5. Dominik prüft die Vorschau. **Merge = veröffentlichen.** Nicht passend: Pull Request schließen und die Fotos in R2 löschen.

Fotos liefert `functions/fotos/[[pfad]].js` aus, und nur, wenn sie zu einem veröffentlichten Beitrag gehören (Liste `/fotos-freigabe.json`, entsteht beim Build). Ein Foto ohne `einwilligung: true` lässt den Build scheitern.

**Einwilligung widerrufen:** In R2 den Ordner `news/<datei>/` (oder einzelne Fotos) löschen und die Einträge unter `bilder:` aus dem Beitrag entfernen. Nach spätestens einer Stunde ist das Foto auch aus dem Cache verschwunden.

## Einmalige Einrichtung

Alle Werte, die keine Geheimnisse sind, stehen in `wrangler.toml`. Solange dort `[Platzhalter]` steht, lehnt das Formular jede Einreichung ab.

### 1. Cloudflare Pages

- Projekt mit dem GitHub-Repository verbinden. Build-Befehl `npm run build`, Ausgabeordner `dist`.
- Weil `wrangler.toml` im Repository liegt, nimmt Pages Bindings und Variablen aus dieser Datei. Im Dashboard sind sie dann nicht mehr änderbar.

### 2. R2-Bucket

- R2 → Bucket `eastside-fotos` anlegen.
- **Öffentlichen Zugriff ausgeschaltet lassen** (keine r2.dev-Adresse, keine eigene Domain). Sonst wären ungeprüfte Fotos öffentlich.

### 3. GitHub App

- GitHub → Settings → Developer settings → GitHub Apps → New GitHub App.
  - Name z. B. „EAST SIDE Einreichungen", Homepage `https://sc-eastside.de`, Webhook ausschalten.
  - Berechtigungen (Repository): **Contents: Read and write**, **Pull requests: Read and write**. Metadata (lesen) kommt automatisch dazu.
  - „Only on this account".
- App installieren, **nur** für `onkeltom/eastside-website`.
- In `wrangler.toml` (beide Abschnitte) eintragen:
  - `GITHUB_APP_ID`: steht auf der Seite der App.
  - `GITHUB_INSTALLATION_ID`: die Zahl am Ende der Adresse unter Settings → Applications → (App) → Configure.
- Private key erzeugen und in das von Cloudflare lesbare Format umwandeln:

```bash
openssl pkcs8 -topk8 -nocrypt -in heruntergeladen.private-key.pem -out app-key.pem
```

- Als Secret für Produktion und Vorschau hinterlegen, danach beide Dateien löschen:

```bash
npx wrangler pages secret put GITHUB_APP_KEY < app-key.pem
```

```bash
npx wrangler pages secret put GITHUB_APP_KEY --env preview < app-key.pem
```

### 4. Cloudflare Access (Login)

- Zero Trust → Settings → Authentication: „One-time PIN" aktivieren. Der Teamname ergibt `ACCESS_TEAM_DOMAIN`, z. B. `https://eastside.cloudflareaccess.com`.
- Zero Trust → Access → Applications → Self-hosted:
  - Pfade `sc-eastside.de/einreichen` und `sc-eastside.de/api/bericht`, dazu dieselben Pfade auf `eastside-website.pages.dev`.
  - Policy „Allow", Regel „Emails": die Adressen der Trainer:innen.
  - Den **Application Audience (AUD) Tag** als `ACCESS_AUD` in den Hauptabschnitt von `wrangler.toml` eintragen.
- Pages-Projekt → Settings → „Access policy" für Vorschau-Versionen einschalten. Den AUD Tag dieser zweiten Access-App in `[env.preview.vars]` eintragen. In Vorschau-Versionen zeigt die Seite Fotos nur angemeldeten Personen (`FOTOS_NUR_MIT_LOGIN = "true"`). Ohne gültiges Login bleiben die Fotos dort gesperrt.

### 5. Ausprobieren

1. `/einreichen/` öffnen, anmelden, einen Testbericht mit einem Foto senden.
2. Im Repository erscheint ein Pull Request „Bericht: …", Cloudflare kommentiert die Vorschau-Adresse.
3. Vorschau öffnen, Foto prüfen, Pull Request schließen, Zweig löschen, Foto in R2 löschen.

## Lokal testen

```bash
node scripts/test-einreichen.mjs
```

Der Test startet `wrangler pages dev` mit lokalem R2 und ahmt Cloudflare Access und die GitHub-API nach. Er braucht keine Zugangsdaten.

## Kosten

Nach meinem Stand im Rahmen der kostenlosen Kontingente (R2 10 GB, Access bis 50 Personen, Functions 100.000 Aufrufe am Tag). Vor dem Livebetrieb auf den Preisseiten von Cloudflare prüfen.
