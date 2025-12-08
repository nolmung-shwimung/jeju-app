// src/pages/List.tsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import TagChips from "../components/TagChips";
import { useFavorites } from "../hooks/useFavorites";

interface Spot {
  id: string | null;
  name: string;
  category: string; // "attraction" | "stay" | "food" 등
  address: string | null;
  // CSV → JSON 변환 시 tags가 string 또는 null일 수도 있으니 타입을 넓혀줌
  tags?: string[] | string | null;
  thumbnailUrl: string | null;
  descriptionShort: string | null;
  openingHours: string | null;
  phone: string | null;
  priceInfo: string | null;
}

// 공백 제거 + 소문자 변환 → "호 텔" == "호텔"
const normalize = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/\s+/g, "");

// tags가 어떤 형태든 항상 string[] 로 바꿔주는 헬퍼
const getTagArray = (raw: Spot["tags"]): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((t) => (t ?? "").trim())
      .filter((t) => t.length > 0);
  }
  // 문자열인 경우 "카페, 자연" → ["카페","자연"]
  return String(raw)
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
};

export default function List() {
  const [sp] = useSearchParams();

  const rawCat = sp.get("cat") || "all";
  const cat =
    rawCat === "attraction" || rawCat === "stay" || rawCat === "food"
      ? rawCat
      : "all";

  const selectedTags = (sp.get("tags") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // 검색어 (홈에서 /list?q=검색어 로 넘어옴)
  const rawQ = (sp.get("q") || "").trim();
  const qNorm = normalize(rawQ);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/data/jeju_spots.json");
        const data: Spot[] = await res.json();

        // ✅ thumbnailUrl 우선순위: 로컬 이미지 > CSV에 있던 값
        const withThumbs = data.map((spot) => {
          const localImg = spot.name
            ? `/spotimage/${spot.name}.jpg`
            : null;

          return {
            ...spot,
            thumbnailUrl: localImg || spot.thumbnailUrl || null,
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
  const byTag: Spot[] =
    selectedTags.length === 0
      ? spotsByCat
      : spotsByCat.filter((spot) => {
          const spotTags = getTagArray(spot.tags);
          return spotTags.some((t) => selectedTags.includes(t));
        });

  // 3) 검색어 필터 (이름 / 주소 / 태그 텍스트)
  const listToShow: Spot[] = !qNorm
    ? byTag
    : byTag.filter((spot) => {
        const nameMatch = normalize(spot.name).includes(qNorm);
        const addressMatch = normalize(spot.address).includes(qNorm);
        const tagMatch = getTagArray(spot.tags).some((tag) =>
          normalize(tag).includes(qNorm)
        );
        return nameMatch || addressMatch || tagMatch;
      });

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">검색 결과</h1>

      <div className="text-sm text-gray-600 space-y-1">
        <div>
          카테고리: <b>{cat}</b> / 태그:{" "}
          <b>{selectedTags.length ? selectedTags.join(", ") : "선택 없음"}</b>
        </div>
        {rawQ && (
          <div>
            검색어: <b>{rawQ}</b>
          </div>
        )}
      </div>

      <TagChips compact category={cat} />

      {loading && (
        <div className="w-full p-6 border rounded-xl bg-gray-50 text-gray-600">
          데이터를 불러오는 중입니다...
        </div>
      )}

      {!loading && listToShow.length === 0 && (
        <div className="w-full p-6 border rounded-xl bg-gray-50 text-gray-600">
          <div className="font-semibold">결과 없음</div>
          <div className="text-sm mt-1">
            선택한 카테고리 / 태그 / 검색어에 해당하는 장소가 없습니다.
          </div>
        </div>
      )}

      {!loading && listToShow.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {listToShow.map((spot) => {
            const fav = isFavorite(spot.id);

            const spotTags = getTagArray(spot.tags);

            return (
              <Link
                key={`${spot.id ?? spot.name}`}
                to={`/detail/${spot.id ?? ""}`}
                className="relative border rounded-2xl overflow-hidden hover:shadow transition bg-white"
              >
                {/* ❤️ 찜 버튼 */}
                <button
                  type="button"
                  className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm ${
                    fav
                      ? "bg-red-500 text-white"
                      : "bg-white/80 text-gray-400"
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!spot.id) return;
                    toggleFavorite({
                      id: String(spot.id),
                      name: spot.name,
                      category: spot.category,
                      thumbnailUrl: spot.thumbnailUrl,
                    });
                  }}
                  aria-label={fav ? "찜 해제" : "찜하기"}
                >
                  {fav ? "♥" : "♡"}
                </button>

                {/* ✅ 이미지 영역 */}
                <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                  {spot.thumbnailUrl ? (
                    <img
                      src={spot.thumbnailUrl}
                      alt={spot.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
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
                    {spotTags.slice(0, 3).map((tag) => (
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
            );
          })}
        </div>
      )}
    </div>
  );
}
