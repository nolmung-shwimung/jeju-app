// src/pages/List.tsx
import { useSearchParams, Link } from "react-router-dom";
import TagChips from "../components/TagChips";

export default function List() {
  const [sp] = useSearchParams();
  const cat = sp.get("cat") || "all";
  const tags = (sp.get("tags") || "").split(",").filter(Boolean);

  // 더미 데이터 (실제 API 연동 전)
  const all = [
    { id: "1", title: "만장굴", tag: "자연" },
    { id: "2", title: "천지연폭포", tag: "자연" },
    { id: "3", title: "바다뷰 카페 A", tag: "사진" },
    { id: "4", title: "애월 반려동물 공원", tag: "반려동물 동반" },
    { id: "5", title: "가족 체험 목장", tag: "가족여행" },
    { id: "6", title: "서핑 스쿨", tag: "액티비티" },
  ];

  // 태그가 선택되었으면 해당 태그만 필터, 없으면 빈 배열(안내 문구 노출)
  const filtered = tags.length === 0 ? [] : all.filter((x) => tags.includes(x.tag));

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">검색 결과</h1>
      <div className="text-sm text-gray-600">
        카테고리: <b>{cat}</b> / 태그: <b>{tags.length ? tags.join(", ") : "선택 없음"}</b>
      </div>

      {/* 상단 태그 칩 (토글 가능) */}
      <TagChips compact />

      {/* 선택 태그 없을 때 안내 */}
      {tags.length === 0 && (
        <div className="w-full p-6 border rounded-xl bg-gray-50 text-gray-600">
          <div className="font-semibold">리스트</div>
          <div className="text-sm mt-1">
            태그를 선택하면 추천 장소/일정이 표시됩니다. (예: 자연, 가족여행, 액티비티 등)
          </div>
        </div>
      )}

      {/* 선택 태그가 있지만 매칭 데이터가 없을 때 */}
      {tags.length > 0 && filtered.length === 0 && (
        <div className="w-full p-6 border rounded-xl bg-gray-50 text-gray-600">
          <div className="font-semibold">결과 없음</div>
          <div className="text-sm mt-1">선택한 태그에 해당하는 데이터가 아직 없습니다.</div>
        </div>
      )}

      {/* 결과 카드 */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <Link
              key={item.id}
              to={`/detail/${item.id}`}
              className="border rounded-2xl overflow-hidden hover:shadow transition"
            >
              <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center text-gray-400">
                이미지
              </div>
              <div className="p-4">
                <div className="font-semibold">{item.title}</div>
                <div className="text-sm text-gray-500">{item.tag}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
