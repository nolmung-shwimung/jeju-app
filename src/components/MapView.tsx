// src/components/MapView.tsx
import React from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

interface MapViewProps {
  lat: number;
  lng: number;
}

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "300px",
  borderRadius: "16px",
  overflow: "hidden",
};

const MapView: React.FC<MapViewProps> = ({ lat, lng }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  if (loadError) {
    return <div>지도를 불러오는 중 오류가 발생했습니다.</div>;
  }

  if (!isLoaded) {
    return <div>지도를 불러오는 중입니다...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{ lat, lng }}
      zoom={14}
    >
      <Marker position={{ lat, lng }} />
    </GoogleMap>
  );
};

export default MapView;
