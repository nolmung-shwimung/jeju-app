// src/utils/loadGoogleMaps.ts
let isLoaded = false;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (isLoaded) return resolve();

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => {
      isLoaded = true;
      resolve();
    };

    document.head.appendChild(script);
  });
}
