// src/pages/Home.tsx
import {
  useState,
  useEffect,
  useMemo,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import { useNavigate, Link } from "react-router-dom";
import TagChips from "../components/TagChips";
import jejuBg from "../assets/images/제주도 배경.jpg";

interface Spot {
  id: string | null;
  name: string;
  category: string; // "attraction" | "stay" | "food"
  address: string | null;
  tags?: string[] | string | null;
  thumbnailUrl: string | null;
  descriptionShort: string | null;
  openingHours: string | null;
  phone: string | null;
  priceInfo: string | null;
}

// 랜덤으로 n개 뽑기
const pickRandom = <T,>(arr: T[], count: number): T[] => {
  if (!arr.length) return [];
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

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

  // jeju_spots.json 로드 + 이미지 자동 매핑
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/data/jeju_spots.json");
        const data: Spot[] = await res.json();

        // 🔥 로컬 이미지 우선 적용 (List.tsx, Detail.tsx와 통일)
        const withThumbs = data.map((spot) => {
          const localImg = spot.name ? `/spotimage/${spot.name}.jpg` : null;
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

  // 카테고리별 분리
  const attractions = useMemo(
    () => spots.filter((s) => s.category === "attraction"),
    [spots]
  );
  const stays = useMemo(
    () => spots.filter((s) => s.category === "stay"),
    [spots]
  );
  const foods = useMemo(
    () => spots.filter((s) => s.category === "food"),
    [spots]
  );

  // 랜덤 추천
  const popularMixed = useMemo(() => pickRandom(spots, 4), [spots]);
  const recommendAttractions = useMemo(
    () => pickRandom(attractions, 4),
    [attractions]
  );
  const recommendStays = useMemo(() => pickRandom(stays, 4), [stays]);
  const recommendFoods = useMemo(() => pickRandom(foods, 4), [foods]);

  return (
    <div className="min-h-svh w-full bg-white">
      {/* ===== Hero ===== */}
      <section
        className="w-full bg-center bg-cover"
        style={{ backgroundImage: `url(${jejuBg})` }}
      >
        <div className="bg-black/45">
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
      <section className="w-full px-4 sm:px-6 lg:px-12 py-10 md:py-12">
        {loading ? (
          <div className="p-6 md:p-7 border rounded-2xl bg-gray-50 text-gray-700 text-center">
            추천 데이터를 불러오는 중입니다...
          </div>
        ) : (
          <div className="space-y-10">
            {/* 1. 인기 관광지 */}
            <SectionBlock
              title="인기 관광지"
              subtitle="여행자들이 많이 찾는 제주 관광지·숙소·맛집을 만나보세요."
              spots={popularMixed}
              viewAllLabel="View all"
              viewAllTo="/list"
            />

            {/* 2. 추천 관광지 */}
            <SectionBlock
              title="추천 관광지"
              subtitle="제주의 자연과 풍경을 느낄 수 있는 여행지입니다."
              spots={recommendAttractions}
              viewAllLabel="View all"
              viewAllTo="/list?cat=attraction"
            />

            {/* 3. 추천 숙소 */}
            <SectionBlock
              title="추천 숙소"
              subtitle="하루의 피로를 풀어줄 제주 감성 숙소를 골라보세요."
              spots={recommendStays}
              viewAllLabel="View all"
              viewAllTo="/list?cat=stay"
            />

            {/* 4. 추천 음식 */}
            <SectionBlock
              title="추천 음식"
              subtitle="제주의 맛을 느낄 수 있는 식당들을 모았어요."
              spots={recommendFoods}
              viewAllLabel="View all"
              viewAllTo="/list?cat=food"
            />
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================
   공통 섹션 컴포넌트
   ============================ */

interface SectionBlockProps {
  title: string;
  subtitle?: string;
  spots: Spot[];
  viewAllLabel: string;
  viewAllTo: string;
}

function SectionBlock({
  title,
  subtitle,
  spots,
  viewAllLabel,
  viewAllTo,
}: SectionBlockProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <Link
          to={viewAllTo}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          {viewAllLabel} &gt;
        </Link>
      </div>

      {spots.length === 0 ? (
        <div className="w-full p-4 rounded-xl bg-gray-50 border text-gray-500 text-sm">
          표시할 장소가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {spots.map((spot) => (
            <Link
              key={spot.id ?? spot.name}
              to={`/detail/${spot.id ?? ""}`}
              className="group border rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition flex flex-col"
            >
              <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                {spot.thumbnailUrl ? (
                  <img
                    src={spot.thumbnailUrl}
                    alt={spot.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    이미지
                  </div>
                )}

                <div className="absolute left-2 top-2 px-2 py-1 rounded-full bg-black/40 text-white text-[10px]">
                  {spot.category === "attraction"
                    ? "관광지"
                    : spot.category === "stay"
                    ? "숙소"
                    : spot.category === "food"
                    ? "음식"
                    : ""}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="text-sm font-semibold truncate">
                  {spot.name}
                </div>
                <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                  {spot.address || "주소 정보 없음"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
