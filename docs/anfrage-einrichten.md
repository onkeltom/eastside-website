# Formular „Probetraining / Warteliste“: Einrichtung

Das Formular auf `/mitmachen/` schickt jede Anfrage als E-Mail an **sc.east.side2023@gmail.com**. Mit „Antworten“ in Gmail geht die Antwort direkt an die Eltern. Die Website speichert nichts.

So läuft es:

1. Eltern füllen das Formular aus und senden es ab.
2. `functions/api/anfrage.js` prüft die Angaben (`cloudflare/anfrage.js`).
3. Cloudflare Email Routing schickt die E-Mail von `formular@sc-eastside.de` an das Vereinspostfach.
4. Eltern sehen „Danke! …“.

Wenn das Senden nicht geht (Vorschau auf GitHub Pages, Vorschau-Versionen auf Cloudflare, Störung), zeigt das Formular einen Link, der eine fertig ausgefüllte E-Mail im Mailprogramm öffnet. Eltern landen also nie in einer Sackgasse.

## Voraussetzungen

- Die Website läuft auf Cloudflare Pages (siehe `docs/einreichen-einrichten.md`, Schritt 2).
- Die Domain sc-eastside.de liegt im DNS bei Cloudflare.

## Schritt 0: Bestehende E-Mail prüfen

Für den Versand muss auf sc-eastside.de **Email Routing** eingeschaltet sein. Dabei setzt Cloudflare eigene MX-Einträge. Empfängt die Domain heute schon E-Mails (z. B. `info@sc-eastside.de` beim Webhoster), würde das diese Postfächer abklemmen.

- Im Cloudflare-Dashboard unter **DNS → Records** nach MX-Einträgen schauen. Alternativ beim Registrar nachsehen.
- **Kein MX-Eintrag oder keine genutzten Postfächer:** weiter mit Schritt 1.
- **Postfächer werden genutzt:** erst klären. Email Routing kann Adressen weiterleiten, ersetzt aber kein Postfach. Notfalls Email Routing auf einer Subdomain einschalten (z. B. `post.sc-eastside.de`) und `ANFRAGE_ABSENDER` in `wrangler.toml` anpassen.

## Schritt 1: Email Routing einschalten

1. Im Cloudflare-Dashboard die Domain **sc-eastside.de → Email → Email Routing** öffnen und **Enable** wählen. Die vorgeschlagenen DNS-Einträge (MX, SPF) übernehmen.
2. Unter **Destination addresses** `sc.east.side2023@gmail.com` hinzufügen.
3. In Gmail auf den Bestätigungslink von Cloudflare klicken. Ohne Bestätigung wird nichts zugestellt.

Kosten: keine. Mails an eigene, bestätigte Adressen sind im kostenlosen Tarif enthalten.

## Schritt 2: Veröffentlichen

In `wrangler.toml` ist bereits alles eingetragen:

- das Binding `ANFRAGEN`, das nur an sc.east.side2023@gmail.com senden darf;
- `ANFRAGE_ABSENDER` und `ANFRAGE_EMPFAENGER`.

Beides gilt nur für die Live-Version. Vorschau-Versionen senden nicht, sondern bieten den E-Mail-Link an.

Nach dem nächsten Deploy unter **Workers & Pages → eastside-website → Settings → Bindings** nachsehen, ob `ANFRAGEN` (Send Email) aufgeführt ist.

> **Falls Cloudflare Pages das Binding nicht annimmt:** Wrangler akzeptiert es für Pages, die Pages-Dokumentation nennt es aber nicht ausdrücklich. Wenn es fehlt, legen wir einen kleinen eigenen Worker nur für den Versand an. Die Pages Function ruft ihn über ein Service-Binding auf (das unterstützt Pages sicher). Das ist eine kleine Änderung; Prüfung und Formular bleiben gleich.

## Schritt 3: Probelauf

1. Auf `https://sc-eastside.de/mitmachen/` eine Gruppe wählen und das Formular mit der eigenen Adresse abschicken.
2. In Gmail sollte nach wenigen Sekunden „Probetraining: U10, Jahrgang …“ ankommen. Absender: „EASTSIDE Website“.
3. „Antworten“ drücken: Als Empfänger steht die eingetragene Adresse, nicht der Verein.
4. Landet die Mail im Spam, einmal „Kein Spam“ markieren und einen Gmail-Filter anlegen: von `formular@sc-eastside.de` → nie als Spam einstufen, Label „Anfragen“.

## Im Alltag

- Anfragen beantworten, danach die Mail löschen. So steht es in der Datenschutzerklärung.
- **Spam:** Ein unsichtbares Feld fängt einfache Spam-Programme ab. Kommt trotzdem viel Spam, Cloudflare Turnstile ergänzen (kostenlos, ohne Cookies).

## Datenschutz

Die Anfrage enthält Daten zu Kindern (Geburtsjahr) und Eltern (Name, E-Mail). Sie läuft über Cloudflare und landet bei Google (Gmail). Der Entwurf in `src/pages/datenschutz.astro` nennt beides. **Vor dem Start rechtlich prüfen lassen**, vor allem Google als Empfänger außerhalb der EU. Ein Postfach bei einem EU-Anbieter (z. B. mailbox.org, Posteo) wäre die sauberere Lösung. Dafür reicht es, in Cloudflare eine andere Zieladresse zu bestätigen und in `wrangler.toml` zwei Zeilen zu ändern.

## Lokal testen

```bash
npm run test:anfrage
```

Der Test startet die Seite mit `wrangler pages dev`, schickt gültige und ungültige Anfragen, prüft die erzeugte E-Mail und spielt das Formular im Browser durch, mit und ohne Server. Er verschickt nichts: wrangler legt E-Mails lokal als Datei ab.
