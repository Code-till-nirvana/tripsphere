let mapsPromise;

export function loadGoogleMaps() {
  const key = import.meta.env.VITE_GOOGLE_PLACE_API_KEY;
  if (!key) return Promise.reject(new Error('VITE_GOOGLE_PLACE_API_KEY is missing'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-tripsphere-google-maps]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google.maps), { once: true });
        existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.dataset.tripsphereGoogleMaps = 'true';
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error('Google Maps failed to load. Check Maps JavaScript API, Places API (New), billing and API-key restrictions.'));
      document.head.appendChild(script);
    });
  }
  return mapsPromise;
}
