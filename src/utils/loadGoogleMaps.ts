// src/utils/loadGoogleMaps.ts

let googleMapsPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  // 이미 로딩 중이면 같은 Promise 재사용
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    // 이미 로드된 경우
    if (typeof window !== "undefined" && (window as any).google) {
      resolve((window as any).google);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("VITE_GOOGLE_MAPS_API_KEY 가 .env 에 설정되어 있지 않아요.");
      reject(new Error("Google Maps API 키 없음"));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-google-maps", "true");

    script.onload = () => {
      if ((window as any).google) {
        resolve((window as any).google);
      } else {
        reject(new Error("Google Maps가 로드되지 않았습니다."));
      }
    };

    script.onerror = () => {
      reject(new Error("Google Maps 스크립트 로드 실패"));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
