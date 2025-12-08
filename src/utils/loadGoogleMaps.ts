<<<<<<< HEAD
let isLoaded = false;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (isLoaded) return resolve();
=======
// src/utils/loadGoogleMaps.ts

let googleMapsPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).google) {
      resolve((window as any).google);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("VITE_GOOGLE_MAPS_API_KEY 가 .env 에 설정되어 있지 않아요.");
      reject(new Error("API 키 없음"));
      return;
    }
>>>>>>> dbe69ae (Add Google Maps to Detail page and fix MapView)

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
<<<<<<< HEAD
    script.onload = () => {
      isLoaded = true;
      resolve();
=======
    script.defer = true;

    script.onload = () => {
      if ((window as any).google) {
        resolve((window as any).google);
      } else {
        reject(new Error("Google Maps가 로드되지 않았습니다."));
      }
    };

    script.onerror = () => {
      reject(new Error("Google Maps 스크립트 로드 실패"));
>>>>>>> dbe69ae (Add Google Maps to Detail page and fix MapView)
    };

    document.head.appendChild(script);
  });
<<<<<<< HEAD
=======

  return googleMapsPromise;
>>>>>>> dbe69ae (Add Google Maps to Detail page and fix MapView)
}
