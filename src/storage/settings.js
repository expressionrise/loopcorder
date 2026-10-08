// Small per-device settings in localStorage.
const LAT_KEY = 'loopcorder-lat';

export function loadLatency() {
  try {
    const v = localStorage.getItem(LAT_KEY);
    return v != null ? +v : null;
  } catch (e) {
    return null;
  }
}

export function saveLatency(ms) {
  try {
    localStorage.setItem(LAT_KEY, ms);
  } catch (e) {
    /* storage unavailable */
  }
}
