// Rendert die Live-Seite zu einer 1024x600-PNG für den Nest-Hub-Bilderrahmen.
import { chromium } from 'playwright';

const URL = process.env.PAGE_URL || 'https://coddler123-sketch.github.io/essensplan/';
const OUT = 'essensplan.png';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1024, height: 600 },
  deviceScaleFactor: 1,
});
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });

// Eine Fehlermeldung (Sheet nicht erreichbar, Format kaputt) darf nie ins
// Fotoalbum wandern. Eine ehrlich leere Woche dagegen schon — ein veralteter
// Plan der Vorwoche wäre schlimmer als sichtbar kein Plan.
if (await page.locator('#message').isVisible()) {
  console.error('Abbruch: ' + (await page.locator('#message').textContent()));
  await browser.close();
  process.exit(1);
}
const rows  = await page.locator('#days .row').count();
const heute = await page.locator('#days .row.today').count();
const leer  = await page.locator('#days .empty-week').count();
if (!(leer === 1 || (rows === 7 && heute === 1))) {
  console.error(`Abbruch: unerwarteter Zustand rows=${rows} heute=${heute} leer=${leer}`);
  await browser.close();
  process.exit(1);
}

await page.screenshot({ path: OUT });
await browser.close();
console.log(`${OUT} geschrieben (${leer ? 'leere Woche' : rows + ' Tage, heute markiert'})`);
