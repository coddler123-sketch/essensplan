// Datenlogik für den Essensplan. Pur und testbar — siehe test.js.

/** CSV nach Zeilen/Feldern. Beachtet Quotes, damit "Reis, Gemüse" nicht zerreißt. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = false;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Akzeptiert 2026-08-24, 24.08.2026 und 24.8.2026. Sonst null. */
export function parseDate(s) {
  const t = (s || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return mkDate(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (m) return mkDate(+m[3], +m[2], +m[1]);
  return null;
}

function mkDate(y, mo, d) {
  const dt = new Date(y, mo - 1, d);
  // Rollover abfangen: 31.02. darf nicht still zum 03.03. werden.
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

export const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Montag der Woche, in der d liegt. */
export function mondayOf(d) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() || 7) - 1));
  return m;
}

/** ISO-8601-Kalenderwoche — nur für die Anzeige im Header. */
export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); // Donnerstag dieser Woche
  const jan1 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - jan1) / 86400000 + 1) / 7);
}

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

/**
 * Baut Montag..Sonntag der Woche um `today`. Tage ohne Sheet-Zeile bleiben leer.
 * rows: rohe CSV-Zeilen inkl. optionaler Kopfzeile. Spalten: Datum, Gericht, Notiz.
 */
export function weekPlan(rows, today) {
  const meals = new Map();
  for (const row of rows) {
    const d = parseDate(row[0]);           // Kopfzeile parst nicht -> fällt raus
    if (d) meals.set(dateKey(d), { meal: (row[1] || '').trim(), note: (row[2] || '').trim() });
  }
  const monday = mondayOf(today);
  const todayKey = dateKey(today);
  const days = WEEKDAYS.map((weekday, i) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const entry = meals.get(dateKey(date)) || { meal: '', note: '' };
    return { date, weekday, ...entry, isToday: dateKey(date) === todayKey };
  });
  return { week: isoWeek(today), from: days[0].date, to: days[6].date, days };
}
