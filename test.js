// node test.js  — fällt um, wenn Wochen-/Datums-/CSV-Logik bricht.
import assert from 'node:assert/strict';
import { parseCsv, parseDate, isoWeek, mondayOf, weekPlan, dateKey } from './plan.js';

// CSV: Quotes schützen Kommas im Gericht
assert.deepEqual(
  parseCsv('Datum,Gericht,Notiz\n2026-08-24,"Reis, Gemüse und Ei",vegi\n'),
  [['Datum', 'Gericht', 'Notiz'], ['2026-08-24', 'Reis, Gemüse und Ei', 'vegi']]
);
assert.deepEqual(parseCsv('a,"sagt ""hallo"""'), [['a', 'sagt "hallo"']]);

// Datumsformate
assert.equal(dateKey(parseDate('2026-08-24')), '2026-08-24');
assert.equal(dateKey(parseDate('24.08.2026')), '2026-08-24');
assert.equal(dateKey(parseDate('4.8.2026')), '2026-08-04');
assert.equal(parseDate('31.02.2026'), null, 'ungültiges Datum darf nicht stillschweigend rollen');
assert.equal(parseDate('Datum'), null, 'Kopfzeile muss durchfallen');

// mondayOf: Sonntag gehört zur ablaufenden Woche, nicht zur nächsten
assert.equal(dateKey(mondayOf(new Date(2026, 7, 24))), '2026-08-24'); // Mo
assert.equal(dateKey(mondayOf(new Date(2026, 7, 30))), '2026-08-24'); // So
assert.equal(dateKey(mondayOf(new Date(2026, 7, 31))), '2026-08-31'); // Mo darauf

// ISO-Wochen-Randfälle
assert.equal(isoWeek(new Date(2026, 0, 1)), 1);   // Do -> KW1 2026
assert.equal(isoWeek(new Date(2027, 0, 1)), 53);  // Fr -> noch KW53 von 2026
assert.equal(isoWeek(new Date(2026, 7, 24)), 35);

// weekPlan: 7 Tage, heute markiert, Lücken leer, andere Wochen ignoriert
const csv = parseCsv([
  'Datum,Gericht,Notiz',
  '2026-08-24,Spaghetti Bolognese,',
  '2026-08-26,Ofengemüse,vegetarisch',
  '2026-09-02,Aus der Folgewoche,',
].join('\n'));
const p = weekPlan(csv, new Date(2026, 7, 26));
assert.equal(p.week, 35);
assert.equal(p.days.length, 7);
assert.equal(dateKey(p.from), '2026-08-24');
assert.equal(dateKey(p.to), '2026-08-30');
assert.equal(p.days[0].meal, 'Spaghetti Bolognese');
assert.equal(p.days[1].meal, '', 'Dienstag hat keine Zeile -> leer');
assert.equal(p.days[2].note, 'vegetarisch');
assert.equal(p.days.filter(d => d.isToday).length, 1);
assert.equal(p.days[2].isToday, true);
assert.ok(!p.days.some(d => d.meal === 'Aus der Folgewoche'));

// --- Kopfzeilen-Prüfung ---
import { headerProblem } from './plan.js';
const H = (s) => headerProblem(parseCsv(s));

assert.equal(H('Datum,Gericht,Notiz\n24.08.2026,Pizza,'), null);
assert.equal(H('datum,gericht,notiz'), null, 'Groß/Kleinschreibung egal');
assert.equal(H(' Datum , Gericht , Notiz '), null, 'Leerzeichen egal');
assert.equal(H('﻿Datum,Gericht,Notiz'), null, 'BOM darf nicht stören');
assert.equal(H('Datum,Gericht'), null, 'Notiz-Spalte darf fehlen');
assert.equal(H('24.08.2026,Pizza,'), null, 'ganz ohne Kopfzeile ist ok');

assert.match(H('Gericht,Datum,Notiz'), /Spalte 1.*Datum.*Gericht/, 'vertauscht wird erkannt');
assert.match(H('Datum,Speise,Notiz'), /Spalte 2.*Gericht.*Speise/);
assert.match(H('Datum,Gericht,Kommentar'), /Spalte 3.*Notiz.*Kommentar/);
assert.match(H(''), /Spalte 1/, 'leeres Sheet wird als Formatproblem gemeldet');

console.log('ok (inkl. Kopfzeilen-Prüfung)');
