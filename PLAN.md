# Essensplan auf Google Nest Hub (2. Gen)

## Was feststeht

- **Interactive Canvas ist tot.** Conversational Actions wurden am 12.06.2023 abgeschaltet.
  Eigene Assistant-Actions mit Fullscreen-Web-UI gibt es nicht mehr. Kein Workaround.
- **Nest Hub 2. Gen**: 1024x600, Fuchsia OS, **kein Browser**, nichts installierbar.
- Es bleiben zwei Wege für eigene Pixel: **Cast** oder **Bilderrahmen (Ambient)**.
- Beide zeigen dieselbe Seite. Die ist fertig — `index.html` + `plan.js`, Daten aus dem
  veröffentlichten Google Sheet (CSV). Egal welcher Weg gewinnt, sie bleibt.

## Die Entscheidung

Keine Messung nötig, das ist eine Präferenz:

| | **A — Ambient** | **B — Cast + Sprache** |
|---|---|---|
| Anzeige | dauerhaft im Ruhezustand | auf Zuruf |
| Sprachbefehl | keiner (unnötig) | „Hey Google, Essensplan" |
| Infrastruktur | wöchentlicher Cloud-Cron | **Always-on-Gerät im LAN** (Pi/NAS/HA) |
| Interaktion | keine, statisches Bild | möglich |
| Risiko | gering | Cast auf 2. Gen ist fragil |

## Weg A — Ambient  ← gewählt

**Rendering läuft.** GitHub Action `.github/workflows/render.yml`, täglich 03:00 UTC
plus manuell auslösbar. Rendert die Live-Seite per Playwright zu 1024x600 und
committet sie. Immer aktuell abrufbar:

    https://coddler123-sketch.github.io/essensplan/essensplan.png

**Täglich, nicht wöchentlich** — die Heute-Markierung wandert, deshalb muss das Bild
jeden Tag neu entstehen.

**Der Wächter in `render.mjs`** bricht ab, wenn die Seite eine Fehlermeldung zeigt
(Sheet weg, Format kaputt). Dann bleibt die letzte gute PNG stehen, statt dass eine
Fehlermeldung im Fotoalbum landet. Eine ehrlich leere Woche wird dagegen gerendert —
ein veralteter Plan der Vorwoche wäre schlimmer als sichtbar kein Plan.

### Offen: der Praxistest am Gerät

Drei Fragen, die keine Doku beantwortet und die über den Ausbau entscheiden:

1. Taucht ein Google-Photos-Album im Google-Home-Bilderrahmen als Quelle auf?
2. Legt der Ambient-Modus Uhr und Wetter über das Bild? Wenn ja, braucht das Layout
   eine Schutzzone an der betroffenen Kante.
3. Wird das Bild unbeschnitten gezeigt, oder croppt der Hub?

Test ohne jede API: PNG herunterladen, von Hand in ein Photos-Album legen, in der
Google-Home-App als einzige Bilderrahmen-Quelle setzen, hinschauen.

### Danach: Upload automatisieren

`photoslibrary.appendonly` existiert weiterhin, Alben anlegen und Bilder hochladen ist
per API möglich. Kostet aber Google-Cloud-Projekt, OAuth-Consent-Screen und einen
Refresh-Token als GitHub Secret. Lohnt sich erst, wenn der Praxistest oben besteht.

## Weg B — Cast + Sprachbefehl

**Cast ist LAN-only.** mDNS-Discovery plus lokale TCP-Verbindung — es gibt keine
Cloud-API, um einem Nest Hub aus dem Internet eine URL zu schicken. Google Home kann
das auch nicht. Ein Dauerläufer im LAN ist für Weg B daher unvermeidbar, selbst wenn
die Seite extern gehostet ist. Er hostet nichts mehr, er löst nur noch aus.

1. Gehostete URL verwenden (siehe oben).
2. **Zuerst das hier**, das ist die einzige Stelle, die hart scheitern kann:
   ```
   pip install catt
   catt scan
   catt -d <hub-ip> cast_site <url>
   ```
   Kommt es fullscreen? Steht es nach 30 Minuten noch? Wenn nein, ist Weg B tot.
3. Erst dann den Sprachbefehl: Google Home kann **keine Webhooks**. Also virtueller
   Schalter in Home Assistant → an Google Home exponiert → Routine „Essensplan"
   schaltet ihn → HA-Automation castet.
   (Ohne HA: IFTTT Google Assistant → Webhook. Feste Phrase geht noch, Variablen und
   Custom-Responses hat IFTTT gestrichen.)
4. Eigener Cast-Receiver (Cast SDK, $5, HTTPS-Pflicht) nur, falls DashCast zu instabil
   ist — mehr Kontrolle über Reconnect und Keep-Alive.

**Auflösung: gemessen.** Der Hub rendert nativ **1024x600, dpr 1** (UA: Fuchsia
WebKit). Skalierungsfaktor exakt 1.0, kein Downscaling. `fit()` in `index.html`
bleibt als Stellschraube drin, greift hier aber nicht.

**Gerät:** DashCast-App-ID 84912283. Eigene Hub-IP per `catt scan` ermitteln.

**Stolperstein:** DashCast lädt eine **bereits geladene URL nicht neu**. Für einen
Reload entweder `catt -d <ip> stop` davor, oder die URL mit `?v=<timestamp>` ändern.

## Stand

- [x] Anzeige gebaut und geprüft (Fehlerfall, lange Namen, Wochen-Randfälle)
- [x] **Weg B am echten Gerät verifiziert**: DashCast startet auf dem 2.-Gen-Hub,
      Seite lädt inkl. ES-Modul und CSV-fetch, Session hielt im Test durch.
      Das Risiko „Cast auf 2. Gen ist fragil" hat sich **nicht** bestätigt.
- [x] Windows-Firewall: Netz war als *Public* eingestuft. Jetzt *Private* + Regel
      „Essensplan Nest Hub" (TCP 4173, nur von der Hub-IP).
- [x] **Hosting steht:** https://coddler123-sketch.github.io/essensplan/
      Rein statisch, HTTPS, immer online. Kein eigener Server nötig — die Seite
      holt das Sheet direkt im Browser. Der lokale Rechner ist raus.
- [x] Google Sheet angelegt, veröffentlicht, URL eingetragen. CORS geprüft:
      `Access-Control-Allow-Origin: *`, kein `gviz`-Fallback nötig.
- [x] Layout einspaltig, 7 Tage untereinander, heute nur mit Rahmen
- [x] Leerzustand und Kopfzeilen-Prüfung (siehe `test.js`)
- [x] **Weg A gewählt.** Tägliches Rendering läuft.
- [ ] Praxistest am Gerät (drei Fragen oben)
