// src/pages/Detail.tsx
import MapView from "../components/MapView";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
<<<<<<< HEAD
<<<<<<< HEAD
import MapView from "../components/MapView";
=======
import { useFavorites } from "../hooks/useFavorites";
<<<<<<< HEAD
>>>>>>> 494a083 (장소 찜하기 기능 추가)
=======
import MapView from "../components/MapView";
>>>>>>> 2b0c8cc (add map)
=======
import { useFavorites } from "../hooks/useFavorites";

>>>>>>> dbe69ae (Add Google Maps to Detail page and fix MapView)

interface Spot {
  id: string | null;
  name: string;
  category: string; // "attraction" | "stay" | "food" 등
  address: string | null;
  // CSV → JSON 때문에 string / null 가능성도 있어서 타입 넓힘
  tags?: string[] | string | null;
  thumbnailUrl: string | null;
  descriptionShort: string | null;
  openingHours: string | null;
  phone: string | null;
  priceInfo: string | null;
<<<<<<< HEAD
<<<<<<< HEAD
  lat: number;
  lng: number;
   // 관광지 요금 / 숙소 등급 / 음식점 부가 정보 등
=======
>>>>>>> 494a083 (장소 찜하기 기능 추가)
=======
  lat: number;
  lng: number;
>>>>>>> 2b0c8cc (add map)
}

// tags를 항상 string[]로 변환하는 헬퍼
const getTagArray = (raw: Spot["tags"]): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((t) => (t ?? "").trim())
      .filter((t) => t.length > 0);
  }
  return String(raw)
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
};

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(true);

  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/data/jeju_spots.json");
        const data: Spot[] = await res.json();

        // ✅ thumbnailUrl 우선순위: 로컬 이미지 > CSV에 있던 값
        const withThumbs = data.map((s) => {
          const localImg = s.name ? `/spotimage/${s.name}.jpg` : null;

          return {
            ...s,
            thumbnailUrl: localImg || s.thumbnailUrl || null,
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

  const fav = isFavorite(spot.id);
  const tags = getTagArray(spot.tags);

  const handleToggleFavorite = () => {
    if (!spot.id) return;
    toggleFavorite({
      id: String(spot.id),
      name: spot.name,
      category: spot.category,
      thumbnailUrl: spot.thumbnailUrl,
    });
  };

  // 카테고리별 추가 정보 (이전 버전 유지)
  const renderExtraInfo = () => {
    if (spot.category === "stay") {
      return (
        <>
          <span className="mr-1">⭐</span>
          <span>{spot.priceInfo || "등급 정보 없음"}</span>
        </>
      );
    }

    if (spot.category === "food") {
      return (
        <>
          <span className="mr-1">🍽</span>
          <span>{spot.priceInfo || "부가 정보 없음"}</span>
        </>
      );
    }

    return (
      <>
        <span className="mr-1">💰</span>
        <span>{spot.priceInfo || "요금 정보 없음"}</span>
      </>
    );
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8 space-y-8">
      {/* 상단 이미지 */}
      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
          {spot.thumbnailUrl ? (
            <img
              src={spot.thumbnailUrl}
              alt={spot.name}
              className="w-full max-h-[420px] object-cover"
              onError={(e) => {
                // 이미지 깨지면 숨기고 텍스트만 보이게
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-gray-400 py-16">사진 공간</span>
          )}
        </div>
      </div>

      {/* 기본 정보 + 찜 버튼 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{spot.name}</h1>

          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 shadow-sm ${
              fav
                ? "bg-red-500 text-white"
                : "bg-white border text-gray-600"
            }`}
          >
            <span>{fav ? "♥" : "♡"}</span>
            <span>{fav ? "찜 해제" : "찜하기"}</span>
          </button>
        </div>

        {/* 태그 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
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

            <div>{renderExtraInfo()}</div>
          </div>
        </div>

        {/* 지도 placeholder */}
<<<<<<< HEAD
  <div className="p-4 rounded-xl bg-gray-50">
    <div className="w-full h-64 rounded-xl overflow-hidden">
      <MapView lat={spot.lat} lng={spot.lng} name={spot.name} />
    </div>
  </div>
</section>
=======
        <div className="p-4 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
        <MapView lat={spot.lat} lng={spot.lng} name={spot.name} />
        </div>
      </section>
>>>>>>> 2b0c8cc (add map)
    </div>
  );
}
