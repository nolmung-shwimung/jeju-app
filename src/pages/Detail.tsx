// src/pages/Detail.tsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

// Spot 타입 정의 (JSON 구조와 동일)
interface Spot {
  id: string;
  name: string;
  category: string;
  address: string;
  tags: string[];
  thumbnailUrl: string | null;
  descriptionShort: string;
  openingHours: string;
  phone: string;
  priceInfo: string;
}

export default function Detail() {
  const { id } = useParams(); // URL에서 id 가져오기

  const [spot, setSpot] = useState<Spot | null>(null);

  useEffect(() => {
    fetch("/data/jeju_spots.json")
      .then((res) => res.json())
      .then((data: Spot[]) => {
        const found = data.find((item) => item.id === id) || null;
        setSpot(found);
      })
      .catch((err) => console.error(err));
  }, [id]);

  if (!spot) return <div className="p-4">데이터를 불러오는 중입니다...</div>;

  return (
    <div className="p-4 space-y-6 max-w-screen-md mx-auto">

      {/* 이미지 영역 */}
      <div className="w-full h-60 bg-gray-200 rounded-lg flex items-center justify-center">
        {spot.thumbnailUrl ? (
          <img
            src={spot.thumbnailUrl}
            alt={spot.name}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <span className="text-gray-500">사진 공간</span>
        )}
      </div>

      <h1 className="text-2xl font-bold">{spot.name}</h1>

      {/* 태그 */}
      <div className="flex flex-wrap gap-2">
        {spot.tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 text-sm bg-blue-100 rounded-full"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* 상세 정보 */}
      <div className="space-y-2">
        <div>📍 주소: {spot.address}</div>
        <div>⏰ 운영시간: {spot.openingHours}</div>
        <div>📞 연락처: {spot.phone}</div>
        <div>💰 입장료: {spot.priceInfo}</div>
      </div>

      {/* 지도 placeholder */}
      <div className="w-full h-64 bg-gray-100 rounded-lg">
        지도 공간
      </div>
    </div>
  );
}
