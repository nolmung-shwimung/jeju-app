<<<<<<< HEAD
=======
<<<<<<< HEAD
declare global {
  interface Window {
    google: any;
  }
}

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";

interface MapViewProps {
  lat: number;
  lng: number;
  name: string;
}

export default function MapView({ lat, lng, name }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("GOOGLE KEY:", import.meta.env.VITE_GOOGLE_MAPS_KEY);
    const initMap = async () => {
      await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_KEY);

      const map = new window.google.maps.Map(mapRef.current!, {
        center: { lat, lng },
        zoom: 15,
      });

      new window.google.maps.Marker({
        position: { lat, lng },
        map,
        title: name,
      });
    };

    initMap();
  }, [lat, lng, name]);

   return (
    <div ref={mapRef} className="w-full h-full rounded-xl" />
  );
}

=======
>>>>>>> 161166045d36211638ed5a9a384ad2bad3b8cffa
// src/components/MapView.tsx

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";

type MapViewProps = {
  lat: number;
  lng: number;
  name: string;
};

export default function MapView({ lat, lng, name }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>("지도 로딩 중...");

  useEffect(() => {
    if (!lat || !lng) {
      setStatus("error");
      setMessage("위치 정보가 부족해요.");
      return;
    }

    if (!mapContainerRef.current) return;

    let cancelled = false;
    setStatus("loading");
    setMessage("지도 로딩 중...");

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapContainerRef.current) return;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat, lng },
          zoom: 14,
        });

        new google.maps.Marker({
          map,
          position: { lat, lng },
          title: name,
        });

        setStatus("ok");
        setMessage("");
      })
      .catch((e) => {
        console.error("Google Maps 로드 에러:", e);
        setStatus("error");
        setMessage("지도를 불러오지 못했어요.");
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, name]);

  return (
    <div
      style={{
        width: "100%",
        height: "250px",
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* 지도 들어갈 영역 */}
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%",
        }}
      />

      {/* 상태 텍스트 */}
      {status !== "ok" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            color: "#4b5563",
            background:
              status === "loading"
                ? "rgba(249, 250, 251, 0.8)"
                : "rgba(254, 242, 242, 0.85)",
          }}
        >
          📍 {name} – {message}
        </div>
      )}
    </div>
  );
}
<<<<<<< HEAD
=======
>>>>>>> dbe69ae (Add Google Maps to Detail page and fix MapView)
>>>>>>> 161166045d36211638ed5a9a384ad2bad3b8cffa
