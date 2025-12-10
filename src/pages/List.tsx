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

/* ============================
   코스 / 일정 정의
   ============================ */

// 코스별 포함 장소 (jeju_spots.json의 name 기준)
const COURSE_MAP: Record<string, string[]> = {
  east: [
    "성산일출봉",
    "섭지코지",
    "우도",
    "아쿠아플라넷제주",
    "드르쿰다in성산",
    "성읍민속마을",
    "메이즈랜드",
  ],
  west: [
    "오설록 티 뮤지엄",
    "새별오름",
    "목장카페 드르쿰다",
    "곽지해수욕장",
    "금능해수욕장",
    "신화테마파크",
    "스누피가든",
  ],
  south: [
    "산방산",
    "용머리해안",
    "천지연폭포",
    "쇠소깍",
    "마라도",
  ],
  north: [
    "도두동 무지개 해안도로",
    "동문재래시장",
    "넥슨컴퓨터박물관",
    "삼양해수욕장",
    "김녕해수욕장",
    "관덕정",
  ],
};

const COURSE_LABEL: Record<string, string> = {
  east: "제주 동쪽 코스",
  west: "제주 서쪽 코스",
  south: "제주 남쪽 코스",
  north: "제주 북쪽 코스",
};

const COURSE_DESC: Record<string, string> = {
  east: "성산·섭지코지·우도 등 동부 해안과 실내 체험을 하루에 돌 수 있는 코스예요.",
  west: "오설록·새별오름·서쪽 바다까지 감성 카페와 뷰 맛집을 모은 코스예요.",
  south: "산방산·용머리해안·폭포·섬까지 남쪽의 바다와 자연을 느끼는 코스예요.",
  north: "제주시와 구좌 쪽 바다, 시내 구경까지 가볍게 둘러보기 좋은 코스예요.",
};

interface CourseItem {
  timeLabel: string; // 오전 / 오후 / 저녁 등
  title: string;
  spotName?: string;
  description?: string;
}

interface CourseDay {
  day: number; // 1일차, 2일차...
  title: string;
  items: CourseItem[];
}

// 방향별 1일차 일정 예시
const COURSE_ITINERARY: Record<string, CourseDay[]> = {
  east: [
    {
      day: 1,
      title: "1일차: 제주 동쪽 핵심 코스",
      items: [
        {
          timeLabel: "오전",
          title: "일출 & 성산 전망 즐기기",
          spotName: "성산일출봉",
          description: "성산일출봉에 올라 일출 또는 탁 트인 바다 뷰 감상.",
        },
        {
          timeLabel: "점심",
          title: "성산 인근 맛집에서 식사",
          description: "성산항 근처 식당에서 해산물 위주로 여유 있게 점심.",
        },
        {
          timeLabel: "오후",
          title: "바다 산책 & 실내 체험",
          spotName: "섭지코지",
          description: "섭지코지 산책 후 아쿠아플라넷제주에서 실내 체험.",
        },
        {
          timeLabel: "오후",
          title: "카페 타임",
          spotName: "드르쿰다in성산",
          description: "드르쿰다in성산에서 디저트와 함께 휴식.",
        },
        {
          timeLabel: "저녁",
          title: "우도 드라이브 또는 해안도로 산책",
          spotName: "우도",
          description: "배 시간을 맞춰 우도를 다녀오거나 성산 일대 해안 드라이브.",
        },
      ],
    },
  ],
  west: [
    {
      day: 1,
      title: "1일차: 감성 가득 서쪽 코스",
      items: [
        {
          timeLabel: "오전",
          title: "녹차밭과 전시 관람",
          spotName: "오설록 티 뮤지엄",
          description: "오설록 티 뮤지엄에서 제주 녹차밭과 전시 감상.",
        },
        {
          timeLabel: "점심",
          title: "서쪽 지역 식당에서 점심",
          description: "협재/한림 일대에서 한식 또는 해산물 식사.",
        },
        {
          timeLabel: "오후",
          title: "오름 & 목장 카페",
          spotName: "새별오름",
          description: "새별오름에서 가벼운 트레킹 후 목장카페 드르쿰다에서 휴식.",
        },
        {
          timeLabel: "오후",
          title: "테마파크 취향 저격",
          spotName: "스누피가든",
          description: "스누피가든 또는 신화테마파크 중 취향에 맞게 선택 방문.",
        },
        {
          timeLabel: "저녁",
          title: "서쪽 바다 선셋 즐기기",
          spotName: "곽지해수욕장",
          description:
            "곽지해수욕장·금능해수욕장에서 노을 감상 후 카페 또는 숙소로 이동.",
        },
      ],
    },
  ],
  south: [
    {
      day: 1,
      title: "1일차: 중문·서귀포 남쪽 코스",
      items: [
        {
          timeLabel: "오전",
          title: "제주 남쪽 바다 풍경",
          spotName: "산방산",
          description: "산방산과 용머리해안 일대를 함께 둘러보며 해안 절경 감상.",
        },
        {
          timeLabel: "점심",
          title: "중문·서귀포 식당에서 점심",
          description: "해산물 또는 흑돼지 등으로 든든하게 점심.",
        },
        {
          timeLabel: "오후",
          title: "폭포 & 강가 산책",
          spotName: "천지연폭포",
          description: "천지연폭포와 쇠소깍을 방문해 남쪽의 물가 풍경 즐기기.",
        },
        {
          timeLabel: "저녁",
          title: "마라도 또는 서귀포 시내",
          spotName: "마라도",
          description: "배 시간을 맞춰 마라도를 다녀오거나 서귀포 시내 산책.",
        },
      ],
    },
  ],
  north: [
    {
      day: 1,
      title: "1일차: 제주시·구좌 북쪽 코스",
      items: [
        {
          timeLabel: "오전",
          title: "공항 근처 해안 드라이브",
          spotName: "도두동 무지개 해안도로",
          description:
            "도두동 무지개 해안도로를 따라 가볍게 산책하며 바다 뷰 감상.",
        },
        {
          timeLabel: "점심",
          title: "제주시내 식사",
          description: "제주시 내 식당에서 한식/분식 등 간단히 점심.",
        },
        {
          timeLabel: "오후",
          title: "박물관 & 바다",
          spotName: "넥슨컴퓨터박물관",
          description: "넥슨컴퓨터박물관 관람 후, 삼양해수욕장·김녕해수욕장 방문.",
        },
        {
          timeLabel: "저녁",
          title: "시내 야경 & 야시장",
          spotName: "동문재래시장",
          description:
            "관덕정 근처 산책 후 동문재래시장에서 간단한 야시장 먹거리 즐기기.",
        },
      ],
    },
  ],
};

/* ============================
   공통 헬퍼
   ============================ */

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

  const course = sp.get("course"); // "east" | "west" | "south" | "north" | null

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

  // 코스에 포함된 장소 이름 배열
  const courseSpotNames =
    course && COURSE_MAP[course] ? COURSE_MAP[course] : [];

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
  const searched: Spot[] = !qNorm
    ? byTag
    : byTag.filter((spot) => {
        const nameMatch = normalize(spot.name).includes(qNorm);
        const addressMatch = normalize(spot.address).includes(qNorm);
        const tagMatch = getTagArray(spot.tags).some((tag) =>
          normalize(tag).includes(qNorm)
        );
        return nameMatch || addressMatch || tagMatch;
      });

  // 4) 코스 필터 (course가 있으면 해당 코스에 포함된 장소만)
  const listToShow: Spot[] =
    courseSpotNames.length === 0
      ? searched
      : searched.filter((spot) => courseSpotNames.includes(spot.name));

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">
        {course && COURSE_LABEL[course]
          ? COURSE_LABEL[course]
          : "검색 결과"}
      </h1>

      {/* 코스 일정표 */}
      {course && COURSE_ITINERARY[course] && (
        <CoursePlan
          label={COURSE_LABEL[course]}
          desc={COURSE_DESC[course]}
          days={COURSE_ITINERARY[course]}
        />
      )}

      <div className="text-sm text-gray-600 space-y-1">
        <div>
          카테고리: <b>{cat}</b> / 태그:{" "}
          <b>{selectedTags.length ? selectedTags.join(", ") : "선택 없음"}</b>
        </div>
        {course && (
          <div>
            코스:{" "}
            <b>{COURSE_LABEL[course] ?? course}</b>
          </div>
        )}
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
            선택한 코스 / 카테고리 / 태그 / 검색어에 해당하는 장소가 없습니다.
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

/* ============================
   코스 일정표 컴포넌트
   ============================ */

interface CoursePlanProps {
  label?: string;
  desc?: string;
  days: CourseDay[];
}

function CoursePlan({ label, desc, days }: CoursePlanProps) {
  return (
    <section className="p-5 md:p-6 rounded-2xl bg-purple-50 border border-purple-100 space-y-4 mb-4">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-purple-800">
          {label ?? "추천 코스 일정"}
        </h2>
        {desc && (
          <p className="mt-1 text-sm text-purple-700">
            {desc}
          </p>
        )}
      </div>

      <div className="space-y-4 md:space-y-5">
        {days.map((day) => (
          <div
            key={day.day}
            className="rounded-2xl bg-white/90 border border-purple-100 px-4 py-3 md:px-5 md:py-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-purple-600">
                {day.day}일차
              </span>
              <span className="text-sm text-gray-700 truncate">
                {day.title}
              </span>
            </div>

            <ul className="space-y-1.5 md:space-y-2">
              {day.items.map((item, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 text-xs text-purple-500 whitespace-nowrap">
                    {item.timeLabel}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">
                      {item.title}
                      {item.spotName && (
                        <span className="ml-1 text-xs text-purple-500">
                          · {item.spotName}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-xs text-purple-500">
        아래 목록에서 이 코스에 포함된 관광지들을 더 자세히 확인할 수 있어요.
      </p>
    </section>
  );
}
