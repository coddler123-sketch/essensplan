// Wetter über Open-Meteo: kein API-Schlüssel, CORS-freundlich, kostenlos.

// WMO-Wettercodes. Open-Meteo liefert nur die Zahl, den Text machen wir selbst.
const CODES = [
  [[0], 'Klar', '☀️'],
  [[1], 'Meist klar', '🌤️'],
  [[2], 'Bewölkt', '⛅'],
  [[3], 'Bedeckt', '☁️'],
  [[45, 48], 'Nebel', '🌫️'],
  [[51, 53, 55], 'Niesel', '🌦️'],
  [[56, 57], 'Gefrierender Niesel', '🌧️'],
  [[61, 63, 65], 'Regen', '🌧️'],
  [[66, 67], 'Gefrierender Regen', '🌧️'],
  [[71, 73, 75], 'Schnee', '🌨️'],
  [[77], 'Schneegriesel', '🌨️'],
  [[80, 81, 82], 'Schauer', '🌦️'],
  [[85, 86], 'Schneeschauer', '🌨️'],
  [[95], 'Gewitter', '⛈️'],
  [[96, 99], 'Gewitter mit Hagel', '⛈️'],
];

/** WMO-Code zu {text, icon}. Unbekannte Codes fallen nicht um. */
export function wetterCode(code) {
  for (const [codes, text, icon] of CODES) {
    if (codes.includes(code)) return { text, icon };
  }
  return { text: '—', icon: '❓' };
}

/**
 * Holt aktuelles Wetter plus Vorhersage.
 * Gibt { jetzt: {grad, text, icon}, tage: [{name, max, min, icon}] } zurück.
 */
export async function holeWetter({ lat, lon, tage = 4 }) {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,weather_code'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
    + `&timezone=Europe%2FBerlin&forecast_days=${tage}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wetter HTTP ${res.status}`);
  return formatWetter(await res.json());
}

/** Trennt Parsen von Netz, damit es testbar bleibt. */
export function formatWetter(d) {
  const jetzt = {
    grad: Math.round(d.current.temperature_2m),
    ...wetterCode(d.current.weather_code),
  };
  const tage = d.daily.time.map((iso, i) => {
    const datum = new Date(iso + 'T12:00:00');
    return {
      name: i === 0 ? 'Heute' : datum.toLocaleDateString('de-DE', { weekday: 'short' }),
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
      ...wetterCode(d.daily.weather_code[i]),
    };
  });
  return { jetzt, tage };
}
