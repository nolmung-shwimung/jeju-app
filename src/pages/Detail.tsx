// src/pages/Detail.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MapView from "../components/MapView";

interface Spot {
  id: string | null;
  name: string;
  category: string; // "attraction" | "stay" | "food" 등
  address: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  descriptionShort: string | null;
  openingHours: string | null;
  phone: string | null;
  priceInfo: string | null;
  lat: number;
  lng: number;
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/data/jeju_spots.json");
        const data: Spot[] = await res.json();

        // ✅ List.tsx와 동일하게 thumbnailUrl 자동 생성
        const withThumbs = data.map((s) => {
          if (s.thumbnailUrl) return s;

          const imgPath = s.name ? `/spotimage/${s.name}.jpg` : null;
          return {
            ...s,
            thumbnailUrl: imgPath,
          };
        });

        const found = withThumbs.find(
          (s) => String(s.id) === String(id)
        );

        setSpot(found ?? null);
      } catch (e) {
        console.error("jeju_spots.json 로드 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        데이터를 불러오는 중입니다...
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        해당 장소 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8 space-y-8">
      {/* 상단 이미지 – 크기 제한 + 중앙 정렬 */}
      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
          {spot.thumbnailUrl ? (
            <img
              src={spot.thumbnailUrl}
              alt={spot.name}
              className="w-full max-h-[420px] object-cover"
            />
          ) : (
            <span className="text-gray-400 py-16">사진 공간</span>
          )}
        </div>
      </div>

      {/* 기본 정보 */}
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">{spot.name}</h1>

        {/* 태그 */}
        {spot.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {spot.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 한 줄 소개 / 설명 */}
        {spot.descriptionShort && (
          <p className="text-sm text-gray-700 leading-relaxed mt-2">
            {spot.descriptionShort}
          </p>
        )}
      </section>

      {/* 상세 정보 카드 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 p-4 rounded-xl bg-gray-50">
          <h2 className="font-semibold mb-2">상세 정보</h2>

          <div className="space-y-2 text-sm text-gray-700">
            <div>
              <span className="mr-1">📍</span>
              <span>{spot.address || "주소 정보 없음"}</span>
            </div>

            <div>
              <span className="mr-1">⏰</span>
              <span>{spot.openingHours || "운영시간 정보 없음"}</span>
            </div>

            <div>
              <span className="mr-1">📞</span>
              <span>{spot.phone || "연락처 정보 없음"}</span>
            </div>

            <div>
              <span className="mr-1">💰</span>
              <span>{spot.priceInfo || "요금 정보 없음"}</span>
            </div>
          </div>
        </div>

        {/* 지도 placeholder */}
  <div className="p-4 rounded-xl bg-gray-50">
    <div className="w-full h-64 rounded-xl overflow-hidden">
      <MapView lat={spot.lat} lng={spot.lng} name={spot.name} />
    </div>
  </div>
</section>
    </div>
  );
}
