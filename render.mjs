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

// Nur rendern, wenn die Seite echte Daten zeigt. Sonst würden wir eine
// Fehlermeldung ins Fotoalbum schieben und der alte Plan wäre weg.
const rows = await page.locator('#days .row').count();
const fehler = await page.locator('#message').isVisible();
const heute = await page.locator('#days .row.today').count();
if (fehler || rows !== 7 || heute !== 1) {
  const text = await page.locator('#message').textContent().catch(() => '');
  console.error(`Abbruch: rows=${rows} heute=${heute} fehler=${fehler} ${text}`);
  await browser.close();
  process.exit(1);
}

await page.screenshot({ path: OUT });
await browser.close();
console.log(`${OUT} geschrieben (${rows} Tage, heute markiert)`);
