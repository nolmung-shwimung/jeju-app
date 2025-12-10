# main.py
# ================================================
# 제주 여행 코스 추천 API (관광 + 음식 + 숙소, 타임라인)
# + 챗봇용 /chat 엔드포인트
# ================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Tuple, Dict
from datetime import datetime, timedelta

import pandas as pd
import numpy as np
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel


# ------------------------------------------------
# 0. FastAPI 기본 설정
# ------------------------------------------------

app = FastAPI(title="Jeju Trip Recommender API")

# 프론트엔드 도메인/포트에 맞게 수정해도 됨
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 예: ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "FastAPI is running!"}


# ------------------------------------------------
# 1. CSV 로드 & 기본 전처리 (서버 시작 시 1번만)
# ------------------------------------------------

CSV_PATH = "data/places_api.csv"

df = pd.read_csv(CSV_PATH)

for col in ["name", "type", "address", "lat", "lng", "keywords", "description"]:
    if col not in df.columns:
        if col in ["lat", "lng"]:
            df[col] = np.nan
        else:
            df[col] = ""

df["keywords"] = df["keywords"].fillna("")
df["description"] = df["description"].fillna("")
df["address"] = df["address"].fillna("")
df["type"] = df["type"].fillna("")

df["search_text"] = (
    df["keywords"].astype(str).str.replace("|", " ", regex=False)
    + " "
    + df["description"].astype(str)
)


# ------------------------------------------------
# 2. 시(제주시/서귀포시) 추출 & 사분면 분류
# ------------------------------------------------

def extract_region_city(address: str) -> str:
    if not isinstance(address, str):
        return "기타"
    if "제주시" in address:
        return "제주시"
    if "서귀포시" in address:
        return "서귀포시"
    return "기타"


df["region_city"] = df["address"].apply(extract_region_city)

jeju_mask = (df["region_city"] == "제주시") & df["lng"].notna()
seogwipo_mask = (df["region_city"] == "서귀포시") & df["lng"].notna()

JEJU_LNG_MID = df.loc[jeju_mask, "lng"].median() if jeju_mask.any() else 126.6
SEOGWIPO_LNG_MID = df.loc[seogwipo_mask, "lng"].median() if seogwipo_mask.any() else 126.6

NAME_TO_SUBREGION = {
    # --- 제주시 서쪽 ---
    "애월": "제주 서",
    "애월읍": "제주 서",
    "한림": "제주 서",
    "한림읍": "제주 서",
    "협재": "제주 서",
    "한경": "제주 서",
    "한경면": "제주 서",
    "고산": "제주 서",
    "이호": "제주 서",
    "이호동": "제주 서",
    "도두": "제주 서",
    "도두동": "제주 서",

    # --- 제주시 동쪽 ---
    "조천": "제주 동",
    "조천읍": "제주 동",
    "함덕": "제주 동",
    "함덕리": "제주 동",
    "구좌": "제주 동",
    "구좌읍": "제주 동",
    "김녕": "제주 동",
    "김녕리": "제주 동",
    "세화": "제주 동",
    "월정": "제주 동",
    "평대": "제주 동",
    "우도": "제주 동",

    # --- 서귀포 동쪽 ---
    "성산": "서귀포 동",
    "성산읍": "서귀포 동",
    "표선": "서귀포 동",
    "표선면": "서귀포 동",
    "남원": "서귀포 동",
    "남원읍": "서귀포 동",

    # --- 서귀포 서쪽 ---
    "중문": "서귀포 서",
    "중문동": "서귀포 서",
    "안덕": "서귀포 서",
    "안덕면": "서귀포 서",
    "대정": "서귀포 서",
    "대정읍": "서귀포 서",
    "모슬포": "서귀포 서",
    "화순": "서귀포 서",
}


def classify_subregion(row) -> str:
    addr = row.get("address", "")
    city = row.get("region_city", "기타")
    lng = row.get("lng", np.nan)

    # 주소에서 동/읍/면 키워드로 먼저 매핑
    if isinstance(addr, str):
        for name, sub in NAME_TO_SUBREGION.items():
            if name in addr:
                return sub

    # 좌표가 없으면 시 기준으로 기본값
    if pd.isna(lng):
        if city == "제주시":
            return "제주 동"
        elif city == "서귀포시":
            return "서귀포 동"
        else:
            return "기타"

    # 좌표 있으면 경도 기준으로 동/서 나누기
    if city == "제주시":
        return "제주 동" if lng >= JEJU_LNG_MID else "제주 서"
    elif city == "서귀포시":
        return "서귀포 동" if lng >= SEOGWIPO_LNG_MID else "서귀포 서"
    else:
        return "기타"


df["subregion"] = df.apply(classify_subregion, axis=1)


# ------------------------------------------------
# 3. 이동시간 매트릭스
# ------------------------------------------------

SUBREGIONS = ["제주 동", "제주 서", "서귀포 동", "서귀포 서", "기타"]
DEFAULT_TRAVEL_TIME = 1.0

travel_time_matrix = {
    "제주 동": {
        "제주 동": 0.3,
        "제주 서": 1.0,
        "서귀포 동": 0.5,
        "서귀포 서": 1.5,
        "기타": 1.0,
    },
    "제주 서": {
        "제주 동": 1.0,
        "제주 서": 0.3,
        "서귀포 동": 1.0,
        "서귀포 서": 0.5,
        "기타": 1.0,
    },
    "서귀포 동": {
        "제주 동": 0.5,
        "제주 서": 1.0,
        "서귀포 동": 0.3,
        "서귀포 서": 1.0,
        "기타": 1.0,
    },
    "서귀포 서": {
        "제주 동": 1.5,
        "제주 서": 0.5,
        "서귀포 동": 1.0,
        "서귀포 서": 0.3,
        "기타": 1.0,
    },
    "기타": {
        "제주 동": 1.0,
        "제주 서": 1.0,
        "서귀포 동": 1.0,
        "서귀포 서": 1.0,
        "기타": 0.5,
    },
}


def get_travel_time(sub1: str, sub2: str) -> float:
    t1 = travel_time_matrix.get(sub1, {})
    return t1.get(sub2, DEFAULT_TRAVEL_TIME)


# ------------------------------------------------
# 4. 태그 / 쿼리 확장
# ------------------------------------------------

BASE_TAGS = [
    {"key": "휴식", "icon": "🧘"},
    {"key": "친구들", "icon": "👫"},
    {"key": "혼자", "icon": "🧭"},
    {"key": "문화", "icon": "🏛️"},
    {"key": "자연", "icon": "🏞️"},
    {"key": "사진", "icon": "📷"},
    {"key": "반려동물 동반", "icon": "🐶"},
    {"key": "가족여행", "icon": "👨‍👩‍👧‍👦"},
    {"key": "액티비티", "icon": "🎯"},
    {"key": "더보기", "icon": "➕"},
]

STAY_TAGS = [
    {"key": "럭셔리", "icon": "💎"},
    {"key": "휴식", "icon": "🛌"},
    {"key": "가족여행", "icon": "👨‍👩‍👧‍👦"},
    {"key": "커플", "icon": "💑"},
    {"key": "사진", "icon": "📷"},
    {"key": "반려동물 동반", "icon": "🐶"},
    {"key": "자연", "icon": "🏞️"},
    {"key": "오션뷰", "icon": "🌊"},
    {"key": "풀빌라", "icon": "🏊"},
    {"key": "더보기", "icon": "➕"},
]

FOOD_TAGS = [
    {"key": "흑돼지", "icon": "🐷"},
    {"key": "고기국수", "icon": "🍜"},
    {"key": "해장국", "icon": "🥣"},
    {"key": "제주향토음식", "icon": "🍲"},
    {"key": "해산물", "icon": "🐟"},
    {"key": "한식", "icon": "🍱"},
    {"key": "일식", "icon": "🍣"},
    {"key": "중식", "icon": "🥡"},
    {"key": "양식", "icon": "🍝"},
    {"key": "더보기", "icon": "➕"},
]

ALL_TAG_KEYS = {t["key"] for t in (BASE_TAGS + STAY_TAGS + FOOD_TAGS)}

TAG_TO_QUERY_EXPANSION = {
    "휴식": "휴식 힐링 조용한 한적한 여유",
    "친구들": "친구 동행 단체 모임",
    "혼자": "혼자 솔로 혼자여행 조용한",
    "문화": "문화 전시 공연 역사 박물관 갤러리",
    "자연": "자연 숲 바다 산 오름 전망 풍경",
    "사진": "사진 포토 포토스팟 인생샷 뷰 전망",
    "반려동물 동반": "반려동물 반려견 애견 동물 동반",
    "가족여행": "가족 가족여행 아이 어린이 키즈",
    "액티비티": "액티비티 체험 체험활동 레저",
    "럭셔리": "럭셔리 고급 프리미엄",
    "커플": "커플 연인 로맨틱 데이트",
    "오션뷰": "오션뷰 바다뷰 바다전망",
    "풀빌라": "풀빌라 수영장 프라이빗",
    "흑돼지": "흑돼지 고기 삼겹살 구이",
    "고기국수": "고기국수 국수 국밥",
    "해장국": "해장국 국밥",
    "제주향토음식": "향토음식 제주음식 토속음식",
    "해산물": "해산물 회 해물 생선",
    "한식": "한식 백반 식당",
    "일식": "일식 초밥 스시",
    "중식": "중식 중국집 짜장 짬뽕",
    "양식": "양식 파스타 피자 스테이크",
}


def extract_tags_from_free_text(free_text: str) -> List[str]:
    if not free_text:
        return []
    tokens = re.split(r"[\s,]+", free_text.strip())
    extra_tags = set()
    for token in tokens:
        if not token:
            continue
        for tag in ALL_TAG_KEYS:
            if tag in token or token in tag:
                extra_tags.add(tag)
    return list(extra_tags)


def build_query_from_tags(selected_tags: List[str], free_text: str = "") -> Tuple[str, List[str]]:
    extra_tags = extract_tags_from_free_text(free_text)
    merged_tags = list(set(selected_tags) | set(extra_tags))

    tokens: List[str] = []
    for tag in merged_tags:
        tag = tag.strip()
        if not tag:
            continue
        tokens.append(tag)
        if tag in TAG_TO_QUERY_EXPANSION:
            tokens.append(TAG_TO_QUERY_EXPANSION[tag])

    if free_text:
        tokens.append(free_text)

    query_text = " ".join(tokens)
    return query_text, merged_tags

# ------------------------------------------------
# 4-1. 챗봇용 키워드 → 태그/지역/기간 파서
# ------------------------------------------------

# 사용자가 쓰는 단어 → 우리 시스템 태그로 매핑
KEYWORD_TO_TAG = {
    # 동행 / 분위기
    "커플": "커플",
    "데이트": "커플",
    "신혼": "커플",
    "허니문": "커플",
    "부부": "커플",

    "가족": "가족여행",
    "아이": "가족여행",
    "키즈": "가족여행",
    "애들": "가족여행",

    "혼자": "혼자",
    "혼행": "혼자",

    # 분위기 / 활동
    "힐링": "휴식",
    "쉬고": "휴식",
    "휴식": "휴식",
    "카페": "휴식",
    "카공": "휴식",

    "바다": "자연",
    "해변": "자연",
    "해수욕장": "자연",
    "오션뷰": "오션뷰",
    "뷰맛집": "사진",
    "사진": "사진",
    "포토": "사진",
    "인생샷": "사진",

    "오름": "자연",
    "산": "자연",
    "숲": "자연",

    # 음식 취향
    "흑돼지": "흑돼지",
    "고기국수": "고기국수",
    "해산물": "해산물",
    "회": "해산물",
    "향토음식": "제주향토음식",
}

# 사용자가 말하는 큰 지역 키워드 → address 필터용 패턴 + 사람한테 보여줄 라벨
AREA_KEYWORDS = {
    # 제주시 서쪽 (애월/한림/협재/한경/이호/도두)
    "제주 서쪽": {
        "pattern": "애월|한림|협재|한경|이호|도두",
        "label": "제주시 서쪽(애월·한림·협재 일대)",
    },
    "애월": {
        "pattern": "애월",
        "label": "애월 일대",
    },
    "한림": {
        "pattern": "한림|협재",
        "label": "한림·협재 일대",
    },

    # 제주시 동쪽
    "제주 동쪽": {
        "pattern": "조천|함덕|구좌|김녕|세화|월정|평대|우도",
        "label": "제주시 동쪽(함덕·구좌 일대)",
    },

    # 서귀포 서쪽 (중문/안덕/대정/모슬포/화순)
    "중문": {
        "pattern": "중문|안덕|대정|모슬포|화순",
        "label": "중문·안덕 일대(서귀포 서쪽)",
    },
    "서귀포 서쪽": {
        "pattern": "중문|안덕|대정|모슬포|화순",
        "label": "서귀포 서쪽(중문 일대)",
    },

    # 서귀포 동쪽 (성산/표선/남원)
    "성산": {
        "pattern": "성산|표선|남원",
        "label": "성산·표선 일대(서귀포 동쪽)",
    },
    "서귀포 동쪽": {
        "pattern": "성산|표선|남원",
        "label": "서귀포 동쪽(성산 일대)",
    },

    # 시 단위
    "제주시": {
        "pattern": "제주시",
        "label": "제주시 전역",
    },
    "서귀포시": {
        "pattern": "서귀포시",
        "label": "서귀포시 전역",
    },
}
def parse_chat_message(message: str):
    """
    사용자가 보낸 자연어 문장을 분석해서
    - tags: ["커플", "자연", "오션뷰", ...]
    - region_filter: 주소 필터용 정규식 패턴 (예: "애월|한림|협재")
    - region_label: 사람이 읽을 예쁜 설명 (예: "제주시 서쪽(애월·한림·협재 일대)")
    - days: 여행 일수
    - max_places_per_day: 하루 관광지 개수
    - start_time_str: 시작 시간
    를 추출한다.
    """
    msg = (message or "").strip()

    # 1) 기본값
    tags: List[str] = []
    region_filter: Optional[str] = None
    region_label: Optional[str] = None
    days = 1
    max_places_per_day = 3
    start_time_str = "09:00"

    # 2) 일수 파싱 (2박3일 / 1박 2일 / 3일 코스 등)
    m = re.search(r"(\d+)\s*박\s*(\d+)\s*일", msg)
    if m:
        # "2박3일"이면 3일
        days = int(m.group(2))
    else:
        m2 = re.search(r"(\d+)\s*일", msg)
        if m2:
            d = int(m2.group(1))
            # 1~5일 사이로 제한
            days = max(1, min(int(d), 5))
    if "당일" in msg or "원데이" in msg:
        days = 1

    # 3) 태그 파싱
    for kw, tag in KEYWORD_TO_TAG.items():
        if kw in msg and tag not in tags:
            tags.append(tag)

    # 4) 지역 파싱
    for key, info in AREA_KEYWORDS.items():
        if key in msg:
            region_filter = info["pattern"]
            region_label = info["label"]
            break

    # 5) 시간대 (대충만 처리)
    if "오후" in msg or "늦게" in msg or "점심" in msg:
        start_time_str = "11:00"
    if "아침 일찍" in msg or "일출" in msg:
        start_time_str = "07:00"

    # 6) 여행 일수에 따라 하루 관광지 개수 조정
    if days >= 3:
        max_places_per_day = 4
    elif days == 1:
        max_places_per_day = 3
    else:
        max_places_per_day = 3

    return {
        "tags": tags,
        "region_filter": region_filter,
        "region_label": region_label,
        "days": days,
        "max_places_per_day": max_places_per_day,
        "start_time_str": start_time_str,
    }

# ------------------------------------------------
# 4-2. 코스 전용 룰 기반 응답 (챗봇)
#      - "제주 서쪽 코스", "제주동쪽코스", "2박3일 제주도 코스" 등
# ------------------------------------------------

# 프론트에서 만든 코스 일정과 동일한 느낌으로 구성
CourseDayRB = Dict[str, object]  # {"day": int, "title": str, "items": List[dict]]

COURSE_ITINERARY_RB: Dict[str, List[CourseDayRB]] = {
    "east": [
        {
            "day": 1,
            "title": "1일차: 제주 동쪽 핵심 코스",
            "items": [
                {
                    "time_label": "오전",
                    "title": "일출 & 성산 전망 즐기기",
                    "spot_name": "성산일출봉",
                    "description": "성산일출봉에 올라 일출 또는 탁 트인 바다 뷰 감상.",
                },
                {
                    "time_label": "점심",
                    "title": "성산 인근 맛집에서 식사",
                    "spot_name": None,
                    "description": "성산항 근처 식당에서 해산물 위주로 여유 있게 점심.",
                },
                {
                    "time_label": "오후",
                    "title": "바다 산책 & 실내 체험",
                    "spot_name": "섭지코지",
                    "description": "섭지코지 산책 후 아쿠아플라넷제주에서 실내 체험.",
                },
                {
                    "time_label": "오후",
                    "title": "카페 타임",
                    "spot_name": "드르쿰다in성산",
                    "description": "드르쿰다in성산에서 디저트와 함께 휴식.",
                },
                {
                    "time_label": "저녁",
                    "title": "우도 드라이브 또는 해안도로 산책",
                    "spot_name": "우도",
                    "description": "배 시간을 맞춰 우도를 다녀오거나 성산 일대 해안 드라이브.",
                },
            ],
        }
    ],
    "west": [
        {
            "day": 1,
            "title": "1일차: 감성 가득 서쪽 코스",
            "items": [
                {
                    "time_label": "오전",
                    "title": "녹차밭과 전시 관람",
                    "spot_name": "오설록 티 뮤지엄",
                    "description": "오설록 티 뮤지엄에서 제주 녹차밭과 전시 감상.",
                },
                {
                    "time_label": "점심",
                    "title": "서쪽 지역 식당에서 점심",
                    "spot_name": None,
                    "description": "협재/한림 일대에서 한식 또는 해산물 식사.",
                },
                {
                    "time_label": "오후",
                    "title": "오름 & 목장 카페",
                    "spot_name": "새별오름",
                    "description": "새별오름에서 가벼운 트레킹 후 목장카페 드르쿰다에서 휴식.",
                },
                {
                    "time_label": "오후",
                    "title": "테마파크 취향 저격",
                    "spot_name": "스누피가든",
                    "description": "스누피가든 또는 신화테마파크 중 취향에 맞게 선택 방문.",
                },
                {
                    "time_label": "저녁",
                    "title": "서쪽 바다 선셋 즐기기",
                    "spot_name": "곽지해수욕장",
                    "description": "곽지해수욕장·금능해수욕장에서 노을 감상 후 카페 또는 숙소로 이동.",
                },
            ],
        }
    ],
    "south": [
        {
            "day": 1,
            "title": "1일차: 중문·서귀포 남쪽 코스",
            "items": [
                {
                    "time_label": "오전",
                    "title": "제주 남쪽 바다 풍경",
                    "spot_name": "산방산",
                    "description": "산방산과 용머리해안 일대를 함께 둘러보며 해안 절경 감상.",
                },
                {
                    "time_label": "점심",
                    "title": "중문·서귀포 식당에서 점심",
                    "spot_name": None,
                    "description": "해산물 또는 흑돼지 등으로 든든하게 점심.",
                },
                {
                    "time_label": "오후",
                    "title": "폭포 & 강가 산책",
                    "spot_name": "천지연폭포",
                    "description": "천지연폭포와 쇠소깍을 방문해 남쪽의 물가 풍경 즐기기.",
                },
                {
                    "time_label": "저녁",
                    "title": "마라도 또는 서귀포 시내",
                    "spot_name": "마라도",
                    "description": "배 시간을 맞춰 마라도를 다녀오거나 서귀포 시내 산책.",
                },
            ],
        }
    ],
    "north": [
        {
            "day": 1,
            "title": "1일차: 제주시·구좌 북쪽 코스",
            "items": [
                {
                    "time_label": "오전",
                    "title": "공항 근처 해안 드라이브",
                    "spot_name": "도두동 무지개 해안도로",
                    "description": "도두동 무지개 해안도로를 따라 가볍게 산책하며 바다 뷰 감상.",
                },
                {
                    "time_label": "점심",
                    "title": "제주시내 식사",
                    "spot_name": None,
                    "description": "제주시 내 식당에서 한식/분식 등 간단히 점심.",
                },
                {
                    "time_label": "오후",
                    "title": "박물관 & 바다",
                    "spot_name": "넥슨컴퓨터박물관",
                    "description": "넥슨컴퓨터박물관 관람 후, 삼양해수욕장·김녕해수욕장 방문.",
                },
                {
                    "time_label": "저녁",
                    "title": "시내 야경 & 야시장",
                    "spot_name": "동문재래시장",
                    "description": "관덕정 근처 산책 후 동문재래시장에서 야시장 먹거리 즐기기.",
                },
            ],
        }
    ],
}

COURSE_KO_NAME_RB: Dict[str, str] = {
    "east": "제주 동쪽 코스",
    "west": "제주 서쪽 코스",
    "south": "제주 남쪽 코스",
    "north": "제주 북쪽 코스",
}


def _format_course_days_rb(days: List[CourseDayRB]) -> str:
    lines: List[str] = []
    for day in days:
        lines.append(f"📅 {day['title']}")
        for item in day["items"]:
            spot_part = f" ({item['spot_name']})" if item.get("spot_name") else ""
            lines.append(f" - {item['time_label']}: {item['title']}{spot_part}")
            if item.get("description"):
                lines.append(f"   · {item['description']}")
        lines.append("")
    return "\n".join(lines).strip()


def _build_single_course_answer(course_key: str) -> Optional[str]:
    if course_key not in COURSE_ITINERARY_RB:
        return None
    title = COURSE_KO_NAME_RB.get(course_key, "")
    body = _format_course_days_rb(COURSE_ITINERARY_RB[course_key])
    return f"🗺 {title} 추천 일정이에요.\n\n{body}"


def _build_2n3d_answer() -> str:
    """
    2박 3일 기본 루트 예시:
    1일차 서쪽 → 2일차 남쪽 → 3일차 동쪽
    """
    order = ["west", "south", "east"]
    lines: List[str] = []
    lines.append("⛱ 2박 3일 제주도 추천 코스예요.")
    lines.append("예시 루트: 1일차 서쪽 → 2일차 남쪽 → 3일차 동쪽\n")

    day_num = 1
    for key in order:
        days = COURSE_ITINERARY_RB.get(key)
        if not days:
            continue
        d = days[0]
        lines.append(f"📅 {day_num}일차: {COURSE_KO_NAME_RB.get(key, d['title'])}")
        for item in d["items"]:
            spot_part = f" ({item['spot_name']})" if item.get("spot_name") else ""
            lines.append(f" - {item['time_label']}: {item['title']}{spot_part}")
        lines.append("")
        day_num += 1

    lines.append("원하면 이 코스를 기준으로 숙소·식당까지 같이 추천해 줄게요.")
    return "\n".join(lines).strip()


def rule_based_course_answer(user_message: str) -> Optional[str]:
    """
    - '제주 서쪽 코스', '제주서쪽코스', '서쪽 일정 추천' 등
    - '2박3일 제주도 코스', '제주 2박 3일 코스' 등
    을 감지해서 코스 텍스트를 바로 반환.
    """
    if not user_message:
        return None

    msg_no_space = user_message.replace(" ", "")
    # 소문자 변환(영어 대비용)
    msg_no_space = msg_no_space.lower()

    # 2박 3일 패턴
    if (
        ("2박3일" in msg_no_space or ("2박" in msg_no_space and "3일" in msg_no_space))
        and "코스" in msg_no_space
    ):
        return _build_2n3d_answer()

    # 방향별 코스
    if "서쪽" in msg_no_space and ("코스" in msg_no_space or "일정" in msg_no_space):
        return _build_single_course_answer("west")
    if "동쪽" in msg_no_space and ("코스" in msg_no_space or "일정" in msg_no_space):
        return _build_single_course_answer("east")
    if "남쪽" in msg_no_space and ("코스" in msg_no_space or "일정" in msg_no_space):
        return _build_single_course_answer("south")
    if "북쪽" in msg_no_space and ("코스" in msg_no_space or "일정" in msg_no_space):
        return _build_single_course_answer("north")

    return None


# ------------------------------------------------
# 5. place / food / stay 카테고리 자동 분류
# ------------------------------------------------

def classify_category(row: pd.Series) -> str:
    t = str(row.get("type", "")).lower()
    kw = str(row.get("keywords", ""))
    desc = str(row.get("description", ""))

    text = t + " " + kw + " " + desc

    if any(word in text for word in [
        "호텔", "리조트", "펜션", "게스트하우스", "숙소", "숙박",
        "hotel", "resort", "guesthouse", "stay"
    ]):
        return "stay"

    if any(word in text for word in [
        "식당", "카페", "커피", "맛집", "음식점",
        "restaurant", "cafe",
        "흑돼지", "고기국수", "해장국", "해산물"
    ]):
        return "food"

    if "food" in t:
        return "food"
    if "stay" in t or "hotel" in t:
        return "stay"

    return "place"


df["category"] = df.apply(classify_category, axis=1)


# ------------------------------------------------
# 6. TF-IDF 학습 (서버 시작 시 1번)
# ------------------------------------------------

vectorizer = TfidfVectorizer(token_pattern=r"(?u)\b\w+\b")
tfidf_matrix = vectorizer.fit_transform(df["search_text"])

df["stay_hours"] = df["category"].map(
    lambda c: 12.0 if c == "stay" else (1.0 if c == "food" else 1.5)
)


# ------------------------------------------------
# 7. 헬퍼 함수들 (정렬, 후보 선택)
# ------------------------------------------------

def sort_by_subregion_then_similarity(sub_df: pd.DataFrame) -> pd.DataFrame:
    sub_df = sub_df.copy()
    sub_df["subregion"] = sub_df["subregion"].fillna("기타")
    order_map = {"제주 동": 0, "제주 서": 1, "서귀포 동": 2, "서귀포 서": 3, "기타": 4}
    sub_df["subrank"] = sub_df["subregion"].map(lambda x: order_map.get(x, 99))
    sub_df = sub_df.sort_values(
        by=["subrank", "similarity"],
        ascending=[True, False]
    ).reset_index(drop=True)
    return sub_df.drop(columns=["subrank"])


def get_best_candidate(
    df_cat: pd.DataFrame,
    used_indices: set,
    preferred_subregion: Optional[str] = None
) -> Optional[pd.Series]:
    if df_cat.empty:
        return None

    if preferred_subregion:
        sub = df_cat[
            (df_cat["subregion"] == preferred_subregion) &
            (~df_cat["orig_idx"].isin(used_indices))
        ]
        if not sub.empty:
            return sub.iloc[0]

    rest = df_cat[~df_cat["orig_idx"].isin(used_indices)]
    if rest.empty:
        return None
    return rest.iloc[0]


# ------------------------------------------------
# 8. 메인 추천 로직 (mixed 버전)
# ------------------------------------------------

def recommend_itinerary_mixed(
    selected_tags: List[str],
    region_filter: Optional[str] = None,
    days: int = 1,
    max_places_per_day: int = 3,
    start_time_str: str = "09:00",
    daily_hours: float = 10.0,
    free_text: str = "",
) -> pd.DataFrame:
    """
    1) 태그 + freeText로 전체 장소에 similarity 부여
    2) place / food / stay 각각 랭킹
    3) place로 Day별 뼈대 (N일 × M개) 만들기
    4) 각 Day마다:
       - 관광지 사이에 같은 사분면 food 1개 끼워 넣기
       - 마지막에 같은 사분면 stay 1개 붙이기
    5) 출발 시간부터 시간 순서로 타임라인 계산
    """

    query_text, merged_tags = build_query_from_tags(selected_tags, free_text=free_text)
    if not query_text.strip():
        return pd.DataFrame()

    candidate_df = df.copy()
    candidate_df["orig_idx"] = candidate_df.index

    # 지역 필터
    if region_filter and region_filter.strip():
        mask_region = candidate_df["address"].str.contains(region_filter.strip(), na=False)
        candidate_df = candidate_df[mask_region]
        if len(candidate_df) == 0:
            candidate_df = df.copy()
            candidate_df["orig_idx"] = candidate_df.index

    # similarity 계산
    idx_list = candidate_df["orig_idx"].tolist()
    candidate_tfidf = tfidf_matrix[idx_list]
    query_vec = vectorizer.transform([query_text])
    cosine_sim = linear_kernel(query_vec, candidate_tfidf).flatten()
    candidate_df["similarity"] = cosine_sim

    place_df = sort_by_subregion_then_similarity(
        candidate_df[candidate_df["category"] == "place"]
    ).copy()
    food_df = sort_by_subregion_then_similarity(
        candidate_df[candidate_df["category"] == "food"]
    ).copy()
    stay_df = sort_by_subregion_then_similarity(
        candidate_df[candidate_df["category"] == "stay"]
    ).copy()

    if place_df.empty and food_df.empty and stay_df.empty:
        return pd.DataFrame()

    total_place_needed = days * max_places_per_day
    place_df = place_df.head(total_place_needed).reset_index(drop=True)

    try:
        base_time = datetime.strptime(start_time_str, "%H:%M")
    except Exception:
        base_time = datetime.strptime("09:00", "%H:%M")

    used_indices: set = set()
    results = []

    for day in range(1, days + 1):
        start_idx = (day - 1) * max_places_per_day
        end_idx = day * max_places_per_day
        day_places = place_df.iloc[start_idx:end_idx]
        day_places = day_places[~day_places["orig_idx"].isin(used_indices)].reset_index(drop=True)

        if day_places.empty:
            continue

        day_start_time = base_time
        current_time = base_time
        day_end_limit = base_time + timedelta(hours=daily_hours)

        prev_subregion = None
        order_in_day = 0

        dominant_sub = (
            day_places["subregion"].value_counts().idxmax()
            if not day_places["subregion"].empty
            else None
        )

        day_food_candidate = get_best_candidate(
            food_df, used_indices, preferred_subregion=dominant_sub
        )
        food_insert_after = 1
        food_inserted = False

        for i, (_, place_row) in enumerate(day_places.iterrows()):
            place_sub = place_row["subregion"]
            stay_h = float(place_row["stay_hours"])

            travel_h = 0.5 if order_in_day == 0 else get_travel_time(prev_subregion, place_sub)

            arrival_time = current_time + timedelta(hours=travel_h)
            end_time = arrival_time + timedelta(hours=stay_h)

            if end_time > day_end_limit + timedelta(hours=1):
                continue

            order_in_day += 1
            used_indices.add(place_row["orig_idx"])

            results.append({
                "day": day,
                "order_in_day": order_in_day,
                "name": place_row.get("name", ""),
                "category": "place",
                "address": place_row.get("address", ""),
                "region_city": place_row.get("region_city", ""),
                "subregion": place_sub,
                "keywords": place_row.get("keywords", ""),
                "description": place_row.get("description", ""),
                "similarity": float(place_row.get("similarity", 0.0)),
                "lat": place_row.get("lat"),
                "lng": place_row.get("lng"),
                "visit_start": arrival_time.strftime("%H:%M"),
                "visit_end": end_time.strftime("%H:%M"),
                "travel_hours": travel_h,
                "stay_hours": stay_h,
            })

            current_time = end_time
            prev_subregion = place_sub

            # 음식 끼워넣기
            if (not food_inserted) and day_food_candidate is not None and (i + 1 == food_insert_after):
                food_sub = day_food_candidate["subregion"]
                food_stay_h = float(day_food_candidate["stay_hours"])
                travel_h_food = get_travel_time(prev_subregion, food_sub)

                arrive_food = current_time + timedelta(hours=travel_h_food)
                end_food = arrive_food + timedelta(hours=food_stay_h)

                if end_food <= day_end_limit + timedelta(hours=1):
                    order_in_day += 1
                    used_indices.add(day_food_candidate["orig_idx"])

                    results.append({
                        "day": day,
                        "order_in_day": order_in_day,
                        "name": day_food_candidate.get("name", ""),
                        "category": "food",
                        "address": day_food_candidate.get("address", ""),
                        "region_city": day_food_candidate.get("region_city", ""),
                        "subregion": food_sub,
                        "keywords": day_food_candidate.get("keywords", ""),
                        "description": day_food_candidate.get("description", ""),
                        "similarity": float(day_food_candidate.get("similarity", 0.0)),
                        "lat": day_food_candidate.get("lat"),
                        "lng": day_food_candidate.get("lng"),
                        "visit_start": arrive_food.strftime("%H:%M"),
                        "visit_end": end_food.strftime("%H:%M"),
                        "travel_hours": travel_h_food,
                        "stay_hours": food_stay_h,
                    })

                    current_time = end_food
                    prev_subregion = food_sub
                    food_inserted = True

        # 숙소
        if prev_subregion is not None:
            day_stay_candidate = get_best_candidate(
                stay_df, used_indices, preferred_subregion=prev_subregion
            )
        else:
            day_stay_candidate = get_best_candidate(
                stay_df, used_indices, preferred_subregion=None
            )

        if day_stay_candidate is not None and prev_subregion is not None:
            stay_sub = day_stay_candidate["subregion"]
            stay_h = float(day_stay_candidate["stay_hours"])
            travel_h_stay = get_travel_time(prev_subregion, stay_sub)

            arrive_stay = current_time + timedelta(hours=travel_h_stay)
            end_stay = arrive_stay + timedelta(hours=stay_h)

            if end_stay <= day_end_limit + timedelta(hours=2):
                order_in_day += 1
                used_indices.add(day_stay_candidate["orig_idx"])

                results.append({
                    "day": day,
                    "order_in_day": order_in_day,
                    "name": day_stay_candidate.get("name", ""),
                    "category": "stay",
                    "address": day_stay_candidate.get("address", ""),
                    "region_city": day_stay_candidate.get("region_city", ""),
                    "subregion": stay_sub,
                    "keywords": day_stay_candidate.get("keywords", ""),
                    "description": day_stay_candidate.get("description", ""),
                    "similarity": float(day_stay_candidate.get("similarity", 0.0)),
                    "lat": day_stay_candidate.get("lat"),
                    "lng": day_stay_candidate.get("lng"),
                    "visit_start": arrive_stay.strftime("%H:%M"),
                    "visit_end": end_stay.strftime("%H:%M"),
                    "travel_hours": travel_h_stay,
                    "stay_hours": stay_h,
                })

    if not results:
        return pd.DataFrame()

    return pd.DataFrame(results)


# ------------------------------------------------
# 9. API Request / Response 모델 정의
# ------------------------------------------------

class RecommendRequest(BaseModel):
    tags: List[str] = []              # ["자연", "사진", ...] (프론트 TAGS 기준)
    region: Optional[str] = None      # "제주시", "서귀포시" 등 (없으면 None)
    days: int = 1                     # 여행 일수
    max_places_per_day: int = 3       # 하루 관광지 개수
    daily_hours: float = 10.0         # 하루 최대 여행 시간
    start_time: str = "09:00"         # "HH:MM"
    freeText: Optional[str] = ""      # 추가 키워드 (예: "오름, 카페, 드라이브")


class ItineraryItem(BaseModel):
    day: int
    order_in_day: int
    name: str
    category: str            # "place" / "food" / "stay"
    address: str
    region_city: str
    subregion: str
    keywords: str
    description: str
    similarity: float
    lat: Optional[float]
    lng: Optional[float]
    visit_start: str         # "HH:MM"
    visit_end: str           # "HH:MM"
    travel_hours: float
    stay_hours: float


class DayPlan(BaseModel):
    day: int
    total_travel_hours: float
    total_stay_hours: float
    start_time: str
    end_time: str
    items: List[ItineraryItem]


class RecommendResponse(BaseModel):
    days: List[DayPlan]


def itinerary_df_to_response(itinerary_df: pd.DataFrame) -> RecommendResponse:
    """DataFrame -> RecommendResponse 변환 공통 함수"""
    if itinerary_df.empty:
        return RecommendResponse(days=[])

    days_result: List[DayPlan] = []

    for day in sorted(itinerary_df["day"].unique()):
        day_df = itinerary_df[itinerary_df["day"] == day].copy()
        day_df = day_df.sort_values("order_in_day")

        total_travel = float(day_df["travel_hours"].sum())
        total_stay = float(day_df["stay_hours"].sum())
        start_time = str(day_df["visit_start"].iloc[0])
        end_time = str(day_df["visit_end"].iloc[-1])

        items: List[ItineraryItem] = []
        for _, row in day_df.iterrows():
            item = ItineraryItem(
                day=int(row["day"]),
                order_in_day=int(row["order_in_day"]),
                name=str(row["name"]),
                category=str(row["category"]),
                address=str(row["address"]),
                region_city=str(row["region_city"]),
                subregion=str(row["subregion"]),
                keywords=str(row["keywords"]),
                description=str(row["description"]),
                similarity=float(row["similarity"]),
                lat=float(row["lat"]) if not pd.isna(row["lat"]) else None,
                lng=float(row["lng"]) if not pd.isna(row["lng"]) else None,
                visit_start=str(row["visit_start"]),
                visit_end=str(row["visit_end"]),
                travel_hours=float(row["travel_hours"]),
                stay_hours=float(row["stay_hours"]),
            )
            items.append(item)

        days_result.append(
            DayPlan(
                day=int(day),
                total_travel_hours=total_travel,
                total_stay_hours=total_stay,
                start_time=start_time,
                end_time=end_time,
                items=items,
            )
        )

    return RecommendResponse(days=days_result)


# ------------------------------------------------
# 10. /recommend 엔드포인트
# ------------------------------------------------

@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    itinerary_df = recommend_itinerary_mixed(
        selected_tags=req.tags,
        region_filter=req.region,
        days=req.days,
        max_places_per_day=req.max_places_per_day,
        start_time_str=req.start_time,
        daily_hours=req.daily_hours,
        free_text=req.freeText or "",
    )

    return itinerary_df_to_response(itinerary_df)


# ------------------------------------------------
# 11. 챗봇용 /chat 엔드포인트
# ------------------------------------------------

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    itinerary: RecommendResponse


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    1) 먼저 rule_based_course_answer로 동/서/남/북/2박3일 코스인지 확인
       - 해당되면 그 코스 텍스트를 reply로 반환, itinerary는 빈 값
    2) 아니면 parse_chat_message로 해석해서 recommend_itinerary_mixed 사용
    """
    # 1) 동/서/남/북/2박3일 코스 룰 기반 응답
    rb_answer = rule_based_course_answer(req.message)
    if rb_answer:
        empty_resp = RecommendResponse(days=[])
        return ChatResponse(reply=rb_answer, itinerary=empty_resp)

    # 2) 일반 챗봇 코스 추천 로직
    ctx = parse_chat_message(req.message)

    itinerary_df = recommend_itinerary_mixed(
        selected_tags=ctx["tags"],
        region_filter=ctx["region_filter"],
        days=ctx["days"],
        max_places_per_day=ctx["max_places_per_day"],
        start_time_str=ctx["start_time_str"],
        daily_hours=10.0,
        free_text=req.message,
    )

    resp = itinerary_df_to_response(itinerary_df)
    reply_text = summarize_itinerary_for_chat(resp, ctx, req.message)

    return ChatResponse(
        reply=reply_text,
        itinerary=resp,
    )



def summarize_itinerary_for_chat(resp: RecommendResponse, ctx: dict, original_message: str) -> str:
    """
    추천 결과 + 파싱된 조건(ctx)을 바탕으로
    사람이 읽기 좋은 한글 설명을 만든다.
    """
    if not resp.days:
        return "조건에 맞는 코스를 찾지 못했어요. 날짜/지역/원하는 분위기를 조금 더 자세히 알려줄래요?"

    desc_parts = []

    # 1) 사용자가 보낸 문장
    if original_message:
        desc_parts.append(f"요청하신 \"{original_message}\" 조건을 바탕으로 코스를 만들어 봤어요 😊")

    # 2) 파싱된 조건 간단 요약
    cond_parts = []
    days = ctx.get("days")
    if days:
        cond_parts.append(f"{days}일 일정")

    region_label = ctx.get("region_label")
    if region_label:
        cond_parts.append(region_label)

    tags = ctx.get("tags") or []
    if tags:
        # 너무 많으면 2~3개만
        show_tags = tags[:3]
        cond_parts.append(" / ".join(show_tags) + " 분위기")

    if cond_parts:
        desc_parts.append(" · ".join(cond_parts))

    lines: List[str] = []

    # 3) 일자별 코스 요약
    for day_plan in resp.days:
        items_text = " → ".join(
            f"{item.name}({item.category}, {item.visit_start}~{item.visit_end})"
            for item in day_plan.items
        )
        lines.append(
            f"{day_plan.day}일차 ({day_plan.start_time}~{day_plan.end_time}) : {items_text}"
        )

    desc_parts.extend(lines)
    desc_parts.append("세부 일정은 화면에서 타임라인으로도 확인할 수 있어요!")

    return "\n".join(desc_parts)



# ------------------------------------------------
# 12. 로컬 실행 방법 (터미널에서)
# ------------------------------------------------
# uvicorn main:app --reload --port 8000
#
# 예: http://127.0.0.1:8000/docs 에서 스웨거 UI로 테스트 가능
