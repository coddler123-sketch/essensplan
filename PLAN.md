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
| Infrastruktur | wöchentlicher Cron | **Always-on-Gerät im LAN** (Pi/NAS/HA) |
| Interaktion | keine, statisches Bild | möglich |
| Risiko | gering | Cast auf 2. Gen ist fragil |

## Weg A — Ambient

Seite per Playwright zu 1024x600-PNG rendern, in ein Google-Photos-Album legen, das am
Hub die **einzige** Bilderrahmen-Quelle ist. Album mit einem Bild = Plan steht permanent.

Notfalls reicht Hochladen von Hand, einmal pro Woche. Die Photos-API hat 2025 ihre
Scopes eingeschränkt — das betrifft nur die Automatisierung, nicht den Ansatz.

## Weg B — Cast + Sprachbefehl

1. Seite im LAN erreichbar machen.
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
- [ ] Google Sheet veröffentlichen, URL in `index.html` eintragen
- [ ] Server dauerhaft laufen lassen (Pi/NAS) — die Seite lädt alle 15 min nach,
      ohne erreichbaren Server zeigt sie nach spätestens 15 min die Fehlermeldung
- [ ] Sprachbefehl über Home Assistant (Schritt 3 oben)
- [ ] Langzeittest: hält die Cast-Session über Stunden/Nacht?
