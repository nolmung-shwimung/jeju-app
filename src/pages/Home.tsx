// src/pages/Home.tsx
import { useNavigate } from "react-router-dom";
import { useState, type KeyboardEvent, type FormEvent } from "react";
import TagChips from "../components/TagChips";
import jejuBg from "../assets/images/제주도 배경.jpg";

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const goSearch = () => {
    const url = q.trim() ? `/list?q=${encodeURIComponent(q.trim())}` : "/list";
    navigate(url);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goSearch();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    goSearch();
  };

  return (
    // 🔹 화면 전체 폭 사용
    <div className="min-h-svh w-full bg-white">
      {/* ===== Hero ===== */}
      <section
        className="w-full bg-center bg-cover"
        style={{ backgroundImage: `url(${jejuBg})` }}
      >
        <div className="bg-black/45">
          {/* 🔹 더 이상 max-w로 안 줄이고, 패딩만 줌 */}
          <div className="w-full px-4 sm:px-6 lg:px-12">
            <div className="pt-10 pb-10 md:pt-14 md:pb-16">
              <h1
                className="
                  text-white font-extrabold leading-tight
                  text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl
                  text-center md:text-left
                "
              >
                제주도에서 나만의 특별한 여행을 만들어보세요
              </h1>

              <form
                onSubmit={onSubmit}
                className="
                  mt-6 w-full
                  bg-white/95 rounded-2xl p-2 md:p-3
                  flex flex-row items-stretch gap-2 md:gap-3
                  flex-nowrap overflow-hidden
                  mx-auto md:mx-0
                  max-w-5xl
                "
                aria-label="검색 폼"
              >
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="검색어"
                  aria-label="검색어 입력"
                  className="
                    min-w-0 flex-1
                    rounded-xl border border-gray-200
                    px-4 py-3 text-base outline-none
                    placeholder:text-gray-400 text-gray-900
                    focus:ring-2 focus:ring-black/20
                  "
                />
                <button
                  type="submit"
                  className="
                    shrink-0
                    rounded-xl bg-black text-white
                    px-5 py-3 text-base font-medium
                    hover:bg-black/90 transition
                  "
                >
                  검색
                </button>
              </form>

              <div className="mt-4">
                <p className="text-white/90 text-sm md:text-base mb-2 text-center md:text-left">
                  제주도에서 어떤 여행을 원하시나요?
                </p>
                <div className="flex justify-center md:justify-start">
                  <TagChips />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 추천 섹션 ===== */}
      {/* 🔹 여기에서도 max-w 제거하고 폭 전체 사용 */}
      <section className="w-full px-4 sm:px-6 lg:px-12 py-10 md:py-12">
        <div className="p-6 md:p-7 border rounded-2xl bg-gray-50 text-gray-700">
          <div className="font-semibold">추천 일정</div>
          <div className="text-sm mt-1">추천 일정이 들어갈 곳입니다.</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mt-6">
          {["A", "B", "C"].map((k, i) => (
            <article key={k} className="border rounded-2xl overflow-hidden bg-white">
              <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                이미지
              </div>
              <div className="p-4">
                <h3 className="font-semibold">추천 장소 {i + 1}</h3>
                <p className="text-sm text-gray-500">설명 자리</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
