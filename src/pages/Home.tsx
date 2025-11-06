// src/pages/Home.tsx
import { useNavigate } from "react-router-dom";
import { useState, type KeyboardEvent } from "react";
import TagChips from "../components/TagChips";

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const goSearch = () => {
    const url = q.trim() ? `/list?q=${encodeURIComponent(q.trim())}` : "/list";
    navigate(url);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") goSearch();
  };

  return (
    <div>
      {/* 히어로: 배경은 풀폭, 내부는 컨테이너 / 적정 높이 확보 */}
      <section
        className="
          w-full
          bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee')]
          bg-cover bg-center
        "
      >
        {/* 살짝 어둡게 */}
        <div className="backdrop-brightness-50">
          <div className="container mx-auto max-w-screen-2xl px-4 py-12 md:py-16 text-white">
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              제주도에서 나만의 특별한 여행을 만들어보세요
            </h1>

            {/* 검색바 */}
            <div className="mt-6 flex gap-2 bg-white/90 p-2 rounded-xl">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="검색어"
                aria-label="검색어 입력"
                className="flex-1 px-3 py-2 rounded-lg outline-none text-gray-900"
              />
              <button
                onClick={goSearch}
                className="px-4 py-2 rounded-lg bg-black text-white"
              >
                검색
              </button>
            </div>

            {/* 태그 칩 */}
            <div className="mt-4">
              <p className="text-sm mb-2">제주도에서 어떤 여행을 원하시나요?</p>
              <TagChips />
            </div>
          </div>
        </div>
      </section>

      {/* 추천 자리표시자: 내부만 컨테이너로 정렬 */}
      <section className="container mx-auto max-w-screen-2xl px-4 py-10">
        <div className="p-6 border rounded-xl bg-gray-50 text-gray-600">
          <div className="font-semibold">추천 일정</div>
          <div className="text-sm mt-1">추천 일정이 들어갈 곳입니다.</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          {["A", "B", "C"].map((k, i) => (
            <div key={k} className="border rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center text-gray-400">
                이미지
              </div>
              <div className="p-4">
                <div className="font-semibold">추천 장소 {i + 1}</div>
                <div className="text-sm text-gray-500">설명 자리</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
