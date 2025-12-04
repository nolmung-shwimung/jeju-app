// src/pages/List.tsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import TagChips from "../components/TagChips";

// JSON 한 개 아이템 타입
interface Spot {
  id: string;
  name: string;
  category: string;          // "attraction" | "stay" | "food" 이런 식
  address: string;
  tags: string[];
  thumbnailUrl: string | null;
  descriptionShort: string;
  openingHours: string;
  phone: string;
  priceInfo: string;
}

export default function List() {
  const [sp] = useSearchParams();

  // ?cat=attraction 이런 식으로 들어오는 값, 없으면 all
  const cat = sp.get("cat") || "all";

  // ?tags=자연,가족여행 이런 식으로 들어오는 값
  const selectedTags = (sp.get("tags") || "")
    .split(",")
    .filter(Boolean);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  // JSON 파일에서 데이터 불러오기
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/data/jeju_spots.json");
        const data: Spot[] = await res.json();
        setSpots(data);
      } catch (e) {
        console.error("jeju_spots.json 로드 실패:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 1) 카테고리 필터 (all이면 전체)
  const spotsByCat =
    cat === "all" ? spots : spots.filter((s) => s.category === cat);

  // 2) 태그 필터
  let filtered: Spot[] = [];
  if (selectedTags.length === 0) {
    // 태그 선택 안 했으면 => 리스트 안 보여주고 안내문만
    filtered = [];
  } else {
    filtered = spotsByCat.filter((spot) =>
      spot.tags?.some((t) => selectedTags.includes(t))
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">검색 결과</h1>

      <div className="text-sm text-gray-600">
        카테고리: <b>{cat}</b> / 태그:{" "}
        <b>{selectedTags.length ? selectedTags.join(", ") : "선택 없음"}</b>
      </div>

      {/* 상단 태그 칩 (토글 가능) */}
<TagChips compact category={cat} />


      {/* 로딩 중 */}
      {loading && (
        <div className="w-full p-6 border rounded-xl bg-gray-50 text-gray-600">
          데이터를 불러오는 중입니다...
        </div>
      )}

      {/* 선택 태그 없을 때 안내 (로딩 끝난 뒤) */}
      {!loading && selectedTags.length === 0 && (
        <div className="w-full p-6 border rounded-xl bg-gray-50 text-gray-600">
          <div className="font-semibold">리스트</div>
          <div className="text-sm mt-1">
            태그를 선택하면 추천 장소/일정이 표시됩니다. (예: 자연, 가족여행, 액티비티 등)
          </div>
        </div>
      )}

      {/* 선택 태그는 있는데 결과 0개일 때 */}
      {!loading && selectedTags.length > 0 && filtered.length === 0 && (
        <div className="w-full p-6 border rounded-xl bg-gray-50 text-gray-600">
          <div className="font-semibold">결과 없음</div>
          <div className="text-sm mt-1">
            선택한 태그에 해당하는 데이터가 아직 없습니다.
          </div>
        </div>
      )}

      {/* 결과 카드 */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((spot) => (
            <Link
              key={spot.id}
              to={`/detail/${spot.id}`}
              className="border rounded-2xl overflow-hidden hover:shadow transition bg-white"
            >
              {/* 이미지 영역 */}
              <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                {spot.thumbnailUrl ? (
                  <img
                    src={spot.thumbnailUrl}
                    alt={spot.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400">사진 공간</span>
                )}
              </div>

              {/* 텍스트 영역 */}
              <div className="p-4 space-y-1">
                <div className="font-semibold truncate">{spot.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {spot.address}
                </div>

                {/* 태그 3개까지만 표시 */}
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
