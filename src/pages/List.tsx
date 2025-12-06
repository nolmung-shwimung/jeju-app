// src/pages/List.tsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import TagChips from "../components/TagChips";

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
}

export default function List() {
  const [sp] = useSearchParams();

  const rawCat = sp.get("cat") || "all";
  const cat =
    rawCat === "attraction" || rawCat === "stay" || rawCat === "food"
      ? rawCat
      : "all";

  const selectedTags = (sp.get("tags") || "")
    .split(",")
    .filter(Boolean);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/data/jeju_spots.json");
        const data: Spot[] = await res.json();

        // ✅ 여기서 thumbnailUrl 자동 생성
        const withThumbs = data.map((spot) => {
          // 이미 thumbnailUrl 값이 있으면 그대로 사용
          if (spot.thumbnailUrl) return spot;

          // 이름을 기반으로 public/spotimage 안의 파일 경로 생성
          // 예: name === "관덕정" → "/spotimage/관덕정.jpg"
          const imgPath = spot.name
            ? `/spotimage/${spot.name}.jpg`
            : null;

          return {
            ...spot,
            thumbnailUrl: imgPath,
          };
        });

        setSpots(withThumbs);
      } catch (e) {
        console.error("jeju_spots.json 로드 실패:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 1) 카테고리 필터
  const spotsByCat =
    cat === "all" ? spots : spots.filter((s) => s.category === cat);

  // 2) 태그 필터
  const filtered: Spot[] =
    selectedTags.length === 0
      ? spotsByCat
      : spotsByCat.filter((spot) =>
          spot.tags?.some((t) => selectedTags.includes(t))
        );

  // 3) 최종 카테고리 체크
  const listToShow =
    cat === "all"
      ? filtered
      : filtered.filter((spot) => spot.category === cat);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">검색 결과</h1>

      <div className="text-sm text-gray-600">
        카테고리: <b>{cat}</b> / 태그:{" "}
        <b>{selectedTags.length ? selectedTags.join(", ") : "선택 없음"}</b>
      </div>

      <TagChips compact category={cat} />

      {loading && (
        <div className="w-full p-6 border rounded-xl bg-gray-50 text-gray-600">
          데이터를 불러오는 중입니다...
        </div>
      )}

      {!loading && selectedTags.length === 0 && (
        <div className="w-full p-6 border rounded-xl bg-gray-50 text-gray-600">
          <div className="font-semibold">리스트</div>
          <div className="text-sm mt-1">
            현재 선택한 카테고리의 모든 장소가 표시됩니다.
            태그를 선택하면 더 정확한 추천으로 좁혀져요. (예: 자연, 가족여행 등)
          </div>
        </div>
      )}

      {!loading && selectedTags.length > 0 && listToShow.length === 0 && (
        <div className="w-full p-6 border rounded-xl bg-gray-50 text-gray-600">
          <div className="font-semibold">결과 없음</div>
          <div className="text-sm mt-1">
            선택한 태그에 해당하는 데이터가 아직 없습니다.
          </div>
        </div>
      )}

      {!loading && listToShow.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {listToShow.map((spot) => (
            <Link
              key={`${spot.id ?? spot.name}`}
              to={`/detail/${spot.id ?? ""}`}
              className="border rounded-2xl overflow-hidden hover:shadow transition bg-white"
            >
              {/* ✅ 이미지 영역 */}
              <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                {spot.thumbnailUrl ? (
                  <img
                    src={spot.thumbnailUrl}
                    alt={spot.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 혹시 파일이 진짜 없으면 깨진 이미지 대신 텍스트 보여주기
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <span className="text-gray-400">사진 공간</span>
                )}
              </div>

              <div className="p-4 space-y-1">
                <div className="font-semibold truncate">{spot.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {spot.address || "주소 정보 없음"}
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {spot.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
