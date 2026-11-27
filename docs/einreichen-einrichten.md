# Berichte einreichen: Einrichtung Schritt für Schritt

Trainer:innen schreiben unter `/einreichen/` einen Bericht und laden Fotos hoch. Sie melden sich mit einem Code per E-Mail an und brauchen kein GitHub-Konto. Dominik prüft jeden Bericht, bevor er online geht.

Diese Anleitung erklärt die einmalige Einrichtung so, dass man sie ohne Vorwissen abarbeiten kann. Rechne mit etwa einer Stunde.

> Die Menünamen bei Cloudflare und GitHub ändern sich ab und zu. Heißt ein Knopf anders, such nach dem ähnlichsten Begriff. Die Anleitung ist nach bestem Wissen geschrieben (Stand November 2026), aber noch nicht an den echten Konten durchgeklickt.

## Die Idee in einfachen Worten

Stell dir den Verein als Haus vor:

| Baustein | Bild | Was er macht |
| --- | --- | --- |
| **Cloudflare Pages** | das Haus | Hier wohnt die Website. Ändert sich etwas im Repository, baut Cloudflare die Seite neu. |
| **R2** | ein abgeschlossener Fotoschrank | Hier liegen alle Fotos. Niemand kommt direkt dran, nur die Website selbst. |
| **Cloudflare Access** | der Türsteher | Lässt nur Trainer:innen auf der Gästeliste zum Formular. Statt Passwort gibt es einen Code per E-Mail. |
| **GitHub App** | ein Roboter mit einem Schlüssel | Darf nur in diesem einen Repository Vorschläge (Pull Requests) anlegen. Sonst nichts. |
| **Pull Request** | ein Zettel „Vorschlag" | Der Bericht liegt bereit, ist aber noch nicht online. Dominik liest ihn und drückt „Merge", dann ist er online. |
| **`wrangler.toml`** | der Einstellungszettel | Datei im Repository, in der steht, welcher Fotoschrank und welcher Roboter gemeint ist. |

### Was passiert, wenn eine Trainerin einen Bericht schickt

1. Sie öffnet `/einreichen/`. Der Türsteher fragt nach ihrer E-Mail-Adresse und schickt einen Code.
2. Sie schreibt den Text und wählt Fotos. Ihr Handy verkleinert die Fotos und entfernt dabei den Aufnahmeort.
3. Die Fotos wandern in den abgeschlossenen Fotoschrank (R2). Zu jedem Foto wird dort vermerkt, wer die Einwilligung der Eltern bestätigt hat. Diese Angabe kommt nicht ins öffentliche Repository.
4. Der Roboter legt einen Pull Request mit dem Text an.
5. Cloudflare baut eine Vorschau-Version. Nur angemeldete Personen sehen dort die Fotos.
6. Dominik schaut sich die Vorschau an. Passt alles, klickt er „Merge". Ein, zwei Minuten später ist der Bericht online, mit Fotos.

Fotos zeigt die Website nur, wenn sie zu einem veröffentlichten Beitrag gehören. Fehlt bei einem Foto der Vermerk `einwilligung: true`, bricht der Bau der Website ab. So kann kein Foto ohne Einwilligung versehentlich online gehen.

## Was du brauchst

- [ ] Ein Cloudflare-Konto (kostenlos), am besten mit einer Vereins-E-Mail-Adresse
- [ ] Dein GitHub-Konto mit Zugriff auf `onkeltom/eastside-website`
- [ ] Einen Computer mit Terminal (Mac: „Terminal". Windows: „Git Bash", kommt mit Git für Windows)
- [ ] Die E-Mail-Adressen der Trainer:innen, die Berichte schicken dürfen

Die Reihenfolge der Schritte ist wichtig. Am besten genau so abarbeiten.

---

## Schritt 1: Den Fotoschrank bauen (R2-Bucket)

1. Auf [dash.cloudflare.com](https://dash.cloudflare.com) anmelden.
2. Links im Menü **R2 Object Storage** öffnen.
   - Beim ersten Mal will Cloudflare eventuell eine Zahlungsmethode sehen. Das ist normal, auch wenn der Verein im kostenlosen Rahmen bleibt.
3. **Create bucket** klicken.
4. Als Namen genau `eastside-fotos` eintragen.
   - Bei **Location** die Option **Specify jurisdiction** wählen und dort **European Union (EU)**. Nur dann bleiben die Fotos garantiert auf Servern in der EU (Datenschutz bei Kinderdaten).
   - Diese Wahl lässt sich später nicht ändern. `wrangler.toml` erwartet genau diese Einstellung (`jurisdiction = "eu"`).
5. **Create bucket** klicken.
6. **Wichtig:** Im Bucket unter **Settings** nichts an „Public access", „R2.dev subdomain" oder „Custom domains" einschalten. Der Schrank bleibt zu. Die Website holt die Fotos selbst heraus, und zwar nur die freigegebenen.

✅ Fertig, wenn: Unter R2 ein Bucket `eastside-fotos` steht und „Public access" auf „Disabled" steht.

---

## Schritt 2: Das Haus bauen (Cloudflare Pages)

1. Links im Menü **Workers & Pages** öffnen.
2. **Create application** klicken.
3. **Nicht** „Continue with GitHub“ wählen (das legt einen Worker an, kein Pages-Projekt). Stattdessen ganz unten den Link **Continue to Pages** („Need to use the legacy Pages workflow?“) klicken, dann **Connect to Git** bzw. **Import an existing Git repository**.
4. GitHub verbinden. Cloudflare fragt, auf welche Repositories es zugreifen darf. **Only select repositories** wählen und `onkeltom/eastside-website` auswählen.
5. Repository `eastside-website` wählen, **Begin setup**.
6. Einstellungen:
   - **Project name:** `eastside-website`. Ist der Name schon vergeben, schlägt Cloudflare einen anderen vor. Dann diesen Namen merken und in `wrangler.toml` bei `name =` eintragen.
   - **Production branch:** `main`
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
7. **Save and Deploy** klicken und warten, bis der Bau fertig ist (ein, zwei Minuten).

Die Website ist jetzt unter `https://eastside-website.pages.dev` erreichbar. Die eigene Domain `sc-eastside.de` kommt erst beim Livebetrieb dazu.

Weil die Datei `wrangler.toml` im Repository liegt, liest Cloudflare den Fotoschrank und die Einstellungen aus dieser Datei. Im Dashboard kann man sie deshalb nicht ändern. Das ist gewollt: So steht alles an einer Stelle.

✅ Fertig, wenn: `https://eastside-website.pages.dev` die Website zeigt.

---

## Schritt 3: Den Roboter bauen (GitHub App)

### 3a. App anlegen

1. Auf GitHub oben rechts auf dein Profilbild → **Settings**.
2. Ganz unten links **Developer settings** → **GitHub Apps** → **New GitHub App**.
3. Ausfüllen:
   - **GitHub App name:** z. B. `EAST SIDE Einreichungen` (muss auf ganz GitHub einmalig sein, notfalls etwas anhängen)
   - **Homepage URL:** `https://sc-eastside.de`
   - **Webhook:** Haken bei **Active** entfernen
4. Unter **Permissions** → **Repository permissions**:
   - **Contents:** Read and write
   - **Pull requests:** Read and write
   - Alles andere bleibt auf „No access". „Metadata: Read-only" setzt GitHub von selbst.
5. **Where can this GitHub App be installed?** → **Only on this account**.
6. **Create GitHub App** klicken.
7. Oben auf der Seite steht jetzt die **App ID** (eine Zahl). Aufschreiben.

### 3b. App installieren

1. Links in der App-Seite **Install App** → neben deinem Konto **Install**.
2. **Only select repositories** → `eastside-website` → **Install**.
3. Du landest auf einer Seite, deren Adresse so aussieht: `https://github.com/settings/installations/12345678`. Die Zahl am Ende ist die **Installation ID**. Aufschreiben.

### 3c. Schlüssel für den Roboter

1. Zurück zur App: **Settings** → **Developer settings** → **GitHub Apps** → deine App.
2. Links im Menü **Credentials** öffnen → Reiter **Key pairs** → neuen Schlüssel erzeugen (Knopf z. B. „Generate a private key“). **Nicht** „Client secrets“ → „New secret“: Das ist etwas anderes und wird hier nicht gebraucht. (In älteren Ansichten steht der Abschnitt „Private keys“ ganz unten unter **General**.) Der Browser lädt eine Datei herunter, z. B. `east-side-einreichungen.2026-11-27.private-key.pem`.
3. Terminal öffnen, in den Download-Ordner wechseln und die Datei umwandeln. Cloudflare versteht nur dieses andere Format:

```bash
cd ~/Downloads
```

```bash
openssl pkcs8 -topk8 -nocrypt -in east-side-einreichungen.2026-11-27.private-key.pem -out app-key.pem
```

   Den Dateinamen nach `-in` an deinen anpassen. Danach liegt `app-key.pem` im Download-Ordner. Sie beginnt mit `-----BEGIN PRIVATE KEY-----` (ohne „RSA").

4. Den Inhalt von `app-key.pem` brauchst du gleich in Schritt 5. **Beide Schlüsseldateien sind geheim.** Nie ins Repository, nie per Chat oder E-Mail verschicken.

✅ Fertig, wenn: Du die App ID, die Installation ID und die Datei `app-key.pem` hast.

---

## Schritt 4: Den Türsteher aufstellen (Cloudflare Access)

### 4a. Zero Trust einrichten

1. Im Cloudflare-Dashboard links **Zero Trust** öffnen.
2. Beim ersten Mal fragt Cloudflare nach einem **Team-Namen**, z. B. `eastside`. Daraus wird die Adresse `https://eastside.cloudflareaccess.com`. Das ist die **Team-Domain**. Aufschreiben.
3. Tarif **Free** wählen (bis 50 Personen kostenlos). Eventuell will Cloudflare auch hier eine Zahlungsmethode.
4. **Settings** → **Authentication** → **Login methods**: Prüfen, dass **One-time PIN** aktiv ist. Das ist der Code per E-Mail.

### 4b. Das Formular schützen

1. **Access** → **Applications** → **Add an application** → **Self-hosted**.
2. **Application name:** `Bericht einreichen`
3. **Session duration:** z. B. **1 month**. Dann müssen sich Trainer:innen nur einmal im Monat neu anmelden.
4. **Application domain**, vier Zeilen (mit „Add domain" weitere hinzufügen):

   | Subdomain | Domain | Path |
   | --- | --- | --- |
   | *(leer)* | `eastside-website.pages.dev` | `einreichen` |
   | *(leer)* | `eastside-website.pages.dev` | `api/bericht` |
   | *(leer)* | `sc-eastside.de` | `einreichen` |
   | *(leer)* | `sc-eastside.de` | `api/bericht` |

   Die `sc-eastside.de`-Zeilen gehen erst, wenn die Domain bei Cloudflare liegt. Bis dahin weglassen und später ergänzen.

5. **Next** → Policy anlegen:
   - **Policy name:** `Trainer:innen`
   - **Action:** Allow
   - **Include** → **Emails** → die Adressen der Trainer:innen eintragen (und deine eigene)
6. **Next** → **Add application**.
7. Die Application öffnen und den **Application Audience (AUD) Tag** kopieren (eine lange Buchstaben-Zahlen-Folge, steht bei „Overview" oder „Basic information"). Das ist die **AUD für Produktion**. Aufschreiben.

Neue Trainerin dazu? Später einfach in dieser Policy ihre E-Mail-Adresse ergänzen. Jemand hört auf? Adresse löschen.

### 4c. Die Vorschau-Versionen schützen

Jeder Bericht bekommt erst eine Vorschau-Version. Dort liegen noch ungeprüfte Fotos, also muss auch hier ein Türsteher stehen.

1. Zurück zu **Workers & Pages** → Projekt `eastside-website` → **Settings**, ganz nach unten scrollen.
2. Im Abschnitt **General** bei **Preview access** auf **Restrict previews** klicken. Cloudflare legt dafür eine zweite Access-Application an (für `*.eastside-website.pages.dev`).
3. In **Zero Trust** → **Access** → **Applications** diese neue Application öffnen:
   - Policy prüfen: Nur du (Dominik) und wer sonst Berichte prüft, steht drin.
   - Den **AUD Tag** kopieren. Das ist die **AUD für Vorschau**. Aufschreiben.

Wird dieser Schritt vergessen, passiert nichts Schlimmes: Die Vorschau zeigt dann einfach keine Fotos.

✅ Fertig, wenn: Du die Team-Domain, die AUD für Produktion und die AUD für Vorschau hast.

---

## Schritt 5: Den Einstellungszettel ausfüllen

### 5a. Geheimen Schlüssel hinterlegen

1. **Workers & Pages** → `eastside-website` → **Settings** → **Variables and Secrets**.
2. **Add** → Typ **Secret**:
   - **Variable name:** `GITHUB_APP_KEY`
   - **Value:** den ganzen Inhalt von `app-key.pem` hineinkopieren, inklusive der Zeilen mit `-----BEGIN` und `-----END`. Zum Kopieren die Datei mit einem Texteditor öffnen. Gehen Zeilenumbrüche verloren, ist das egal.
3. Speichern. Dasselbe noch einmal für die Umgebung **Preview** machen. Je nach Ansicht gibt es oben eine Auswahl „Production / Preview".
4. Danach beide Schlüsseldateien im Download-Ordner löschen. Brauchst du den Schlüssel noch mal, erzeugst du bei GitHub einfach einen neuen.

### 5b. `wrangler.toml` ausfüllen

Die Datei liegt im Repository ganz oben. Am einfachsten auf GitHub im Browser bearbeiten: Datei öffnen → Stift-Symbol.

Ersetze jedes `[Platzhalter]`, **in beiden Abschnitten**:

| Eintrag | Was hinein | Woher |
| --- | --- | --- |
| `GITHUB_APP_ID` | die App ID | Schritt 3a |
| `GITHUB_INSTALLATION_ID` | die Installation ID | Schritt 3b |
| `ACCESS_TEAM_DOMAIN` | z. B. `https://eastside.cloudflareaccess.com`, **ohne** `/` am Ende | Schritt 4a |
| `ACCESS_AUD` oben unter `[vars]` | AUD für Produktion | Schritt 4b |
| `ACCESS_AUD` unten unter `[env.preview.vars]` | AUD für Vorschau | Schritt 4c |

Keiner dieser Werte ist geheim. Sie dürfen im öffentlichen Repository stehen. Geheim ist nur der Schlüssel aus Schritt 5a.

Änderung auf `main` speichern („Commit changes"). Cloudflare baut die Seite automatisch neu.

✅ Fertig, wenn: In `wrangler.toml` kein `[Platzhalter]` mehr steht und der neue Bau unter Workers & Pages → `eastside-website` → **Deployments** grün ist.

---

## Schritt 6: Probelauf

1. Auf dem Handy `https://eastside-website.pages.dev/einreichen/` öffnen.
2. E-Mail-Adresse eingeben, Code aus der E-Mail eintippen.
3. Testbericht schreiben, Titel z. B. „Test bitte nicht veröffentlichen", ein harmloses Foto ohne Kinder wählen (z. B. eine leere Laufbahn), Einwilligung anhaken, absenden.
4. Es erscheint „Danke – ist angekommen!".
5. Auf GitHub unter **Pull requests** liegt jetzt „Bericht: Test bitte nicht veröffentlichen".
6. Nach ein, zwei Minuten kommentiert Cloudflare den Pull Request mit einer Vorschau-Adresse. Öffnen, anmelden, zum Bericht unter News gehen und prüfen, ob das Foto erscheint.
7. Aufräumen:
   - Pull Request **schließen** (nicht mergen) → **Delete branch** klicken
   - In R2 → `eastside-fotos` → Ordner `news/` → den Ordner des Tests löschen

✅ Fertig, wenn: Alles geklappt hat. Jetzt den Trainer:innen die Adresse `/einreichen/` schicken.

---

## Im Alltag

### Einen Bericht prüfen und veröffentlichen

1. GitHub schickt dir eine Benachrichtigung über den neuen Pull Request.
2. Vorschau-Adresse aus dem Cloudflare-Kommentar öffnen und den Bericht lesen. Prüfen:
   - [ ] Keine Namen von Kindern im Text
   - [ ] Fakten stimmen (Platzierungen, Wettkampf, Datum)
   - [ ] Die Fotos passen und zeigen niemanden in unangenehmen Situationen
3. Kleine Korrekturen am Text: Im Pull Request **Files changed** → bei der Datei **⋯** → **Edit file** → ändern → **Commit changes**.
4. Alles gut: **Merge pull request** → **Confirm merge** → **Delete branch**. In ein, zwei Minuten ist der Bericht online.

### Einen Bericht ablehnen

Pull Request schließen, Zweig löschen und in R2 den Ordner `news/<name-des-berichts>/` löschen. Der Name steht im Pull Request.

### Eltern ziehen die Einwilligung zurück

1. In R2 → `eastside-fotos` das Foto suchen und löschen. Die Fotos eines Berichts liegen in `news/<name-des-berichts>/01.jpg`, `02.jpg` …
2. In der Datei des Berichts (`src/content/news/<name>.md`) den passenden Eintrag unter `bilder:` entfernen.

Ab Schritt 1 zeigt die Website das Foto nicht mehr. Wer es schon geladen hatte, sieht es höchstens noch eine Stunde aus dem Zwischenspeicher.

---

## Wenn etwas nicht klappt

| Was du siehst | Woran es meist liegt |
| --- | --- |
| Formular sagt „Deine Anmeldung ist abgelaufen" oder „Bitte zuerst anmelden" | `ACCESS_TEAM_DOMAIN` oder `ACCESS_AUD` in `wrangler.toml` falsch, Schrägstrich am Ende der Team-Domain, oder der Pfad `api/bericht` fehlt in der Access-Application. |
| Formular sagt „Speichern hat nicht geklappt" | Roboter kommt nicht an GitHub: App ID, Installation ID oder Schlüssel falsch, oder die App ist nicht für das Repository installiert. Genaueres zeigen die Logs: Workers & Pages → `eastside-website` → Deployment → **Functions** → **Real-time logs**, dann noch einmal absenden. |
| Kein Login, man kommt direkt zum Formular | Access-Application deckt die Adresse nicht ab. Das Absenden scheitert dann trotzdem, weil die Website das Login selbst prüft. Trotzdem Schritt 4b prüfen. |
| Vorschau zeigt keine Fotos | Schritt 4c fehlt oder die AUD für Vorschau ist falsch. |
| Live-Seite zeigt keine Fotos, oder der Bau meldet einen unbekannten Bucket | Bucket heißt nicht genau `eastside-fotos`, wurde ohne Jurisdiction EU angelegt, oder die Fotos wurden in R2 gelöscht. |
| Bau bei Cloudflare schlägt fehl mit „einwilligung" | Ein Beitrag hat ein Foto ohne `einwilligung: true`. Das ist Absicht: Erst die Einwilligung klären, dann eintragen. |

## Lokal testen (für Entwickler:innen)

```bash
npm run test:einreichen
```

Der Test baut die Seite, startet sie mit `wrangler pages dev` samt nachgebautem Fotoschrank und spielt Türsteher und GitHub nach. Er braucht keine Zugangsdaten und räumt hinterher auf.

## Kosten

Nach unserem Stand liegt alles im kostenlosen Rahmen: R2 bis 10 GB, Access bis 50 Personen, Functions bis 100.000 Aufrufe am Tag. Ein Bericht mit 10 Fotos braucht etwa 5 MB, 10 GB reichen also für rund 2.000 Berichte. Die Grenzen vor dem Livebetrieb auf den Preisseiten von Cloudflare nachprüfen.
