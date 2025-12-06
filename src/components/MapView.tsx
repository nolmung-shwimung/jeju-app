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

