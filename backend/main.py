# main.py
# ================================================
# 놀멍쉬멍 데이터 기반 제주 여행 코스 추천 API
# - attraction + food + stay 종합
# - Day / 코스 순서만 제공 (시간 정보 없음)
# - 자연어/키워드 입력 자동 파싱 (/recommend_text)
# - 챗봇용 /chat 엔드포인트 + 룰 기반 코스 응답
# ================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Tuple, Dict

import pandas as pd
import numpy as np
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

# ------------------------------------------------
# 0. FastAPI 기본 설정
# ------------------------------------------------

app = FastAPI(title="Jeju Nolmeong-Swimeong Trip Recommender API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 필요 시 프론트 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "FastAPI is running!"}

# ------------------------------------------------
# 1. CSV 로드 & 기본 전처리
# ------------------------------------------------

# ✅ 네 환경에 맞게만 바꿔둔 경로
CSV_PATH = "/Users/ijimin/jeju-app/backend/data/놀멍쉬멍 데이터.csv"

df = pd.read_csv(CSV_PATH)

# 예상 컬럼: id, name, category, address, tags, thumbnailUrl,
#           descriptionShort, openingHours, phone, priceInfo, lat, lng
for col in ["name", "category", "address", "tags", "descriptionShort", "lat", "lng"]:
    if col not in df.columns:
        df[col] = np.nan if col in ["lat", "lng"] else ""

df["tags"] = df["tags"].fillna("")
df["descriptionShort"] = df["descriptionShort"].fillna("")
df["address"] = df["address"].fillna("")
df["category"] = df["category"].fillna("")

# 검색용 텍스트: tags + descriptionShort
df["search_text"] = df["tags"].astype(str) + " " + df["descriptionShort"].astype(str)

# ------------------------------------------------
# 2. 행정구역 & 사분면 (제주 동/서, 서귀포 동/서)
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

# 실제 지명 기반 사분면 매핑
NAME_TO_SUBREGION = {
    # 제주시 서쪽
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
    # 제주시 동쪽
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
    # 서귀포 동쪽
    "성산": "서귀포 동",
    "성산읍": "서귀포 동",
    "표선": "서귀포 동",
    "표선면": "서귀포 동",
    "남원": "서귀포 동",
    "남원읍": "서귀포 동",
    # 서귀포 서쪽
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

    # 1) 주소에 지명이 있으면 우선 사용
    if isinstance(addr, str):
        for name, sub in NAME_TO_SUBREGION.items():
            if name in addr:
                return sub

    # 2) lng 없으면 도시 기준으로 대충 분류
    if pd.isna(lng):
        if city == "제주시":
            return "제주 동"
        elif city == "서귀포시":
            return "서귀포 동"
        else:
            return "기타"

    # 3) lng 기준으로 동/서 분할
    if city == "제주시":
        return "제주 동" if lng >= JEJU_LNG_MID else "제주 서"
    elif city == "서귀포시":
        return "서귀포 동" if lng >= SEOGWIPO_LNG_MID else "서귀포 서"
    else:
        return "기타"

df["subregion"] = df.apply(classify_subregion, axis=1)

# ------------------------------------------------
# 3. 프론트 태그 정의 & 확장 (TAGS / STAY_TAGS / FOOD_TAGS)
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

# 추가 태그(내부용) - '맛집' 같은 것
EXTRA_TAG_KEYS = [
    "맛집",
]

ALL_TAG_KEYS = {t["key"] for t in (BASE_TAGS + STAY_TAGS + FOOD_TAGS)} | set(EXTRA_TAG_KEYS)

TAG_TO_QUERY_EXPANSION = {
    "휴식": "휴식 힐링 조용한 한적한 여유 카페",
    "친구들": "친구 동행 단체 모임",
    "혼자": "혼자 솔로 혼자여행 조용한",
    "문화": "문화 전시 공연 역사 박물관 갤러리 체험",
    "자연": "자연 숲 바다 산 오름 전망 풍경 해변 드라이브",
    "사진": "사진 포토 포토스팟 인생샷 뷰 전망 야경",
    "반려동물 동반": "반려동물 반려견 애견 동물 동반",
    "가족여행": "가족 가족여행 아이 어린이 키즈",
    "액티비티": "액티비티 체험 레저 서핑 승마 카약",
    "럭셔리": "럭셔리 고급 프리미엄 스파",
    "커플": "커플 연인 로맨틱 데이트 감성",
    "오션뷰": "오션뷰 바다뷰 바다전망 해변 해안",
    "풀빌라": "풀빌라 수영장 프라이빗 독채",
    "흑돼지": "흑돼지 고기 삼겹살 구이",
    "고기국수": "고기국수 국수 국밥",
    "해장국": "해장국 국밥",
    "제주향토음식": "향토음식 제주음식 토속음식",
    "해산물": "해산물 회 해물 생선 조개",
    "한식": "한식 백반 식당",
    "일식": "일식 초밥 스시",
    "중식": "중식 중국집 짜장 짬뽕",
    "양식": "양식 파스타 피자 스테이크",
    "맛집": "맛집 음식점 식당 카페 로컬 맛집",
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
        t = tag.strip()
        if not t:
            continue
        tokens.append(t)
        if t in TAG_TO_QUERY_EXPANSION:
            tokens.append(TAG_TO_QUERY_EXPANSION[t])

    if free_text:
        tokens.append(free_text)

    query_text = " ".join(tokens)
    return query_text, merged_tags

# ------------------------------------------------
# 4. category → place / food / stay 매핑
# ------------------------------------------------

def map_category(cat: str) -> str:
    c = str(cat).lower()
    if c == "attraction":
        return "place"
    if c == "food":
        return "food"
    if c == "stay":
        return "stay"
    if any(k in c for k in ["food", "restaurant", "cafe", "식당", "카페", "맛집"]):
        return "food"
    if any(k in c for k in ["stay", "hotel", "숙소", "펜션", "리조트", "게스트하우스"]):
        return "stay"
    return "place"

df["category_mapped"] = df["category"].map(map_category)

# ✅ 사람 읽기용 카테고리 라벨 (이 부분이 새로 들어간 부분)
CATEGORY_LABEL = {
    "place": "관광",
    "food": "식사",
    "stay": "숙소",
}

# ------------------------------------------------
# 5. TF-IDF 학습
# ------------------------------------------------

vectorizer = TfidfVectorizer(token_pattern=r"(?u)\b\w+\b")
tfidf_matrix = vectorizer.fit_transform(df["search_text"])

# ------------------------------------------------
# 6. 헬퍼: 정렬 / 후보 선택
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
    preferred_subregion: Optional[str] = None,
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
# 7. 메인 추천 로직 (시간 X, Day/순서만)
# ------------------------------------------------

def recommend_itinerary_no_time(
    selected_tags: List[str],
    region_filter_address: Optional[str] = None,
    region_filter_subregions: Optional[List[str]] = None,
    days: int = 1,
    max_places_per_day: int = 3,
    free_text: str = "",
) -> pd.DataFrame:
    """
    - 태그 + freeText 기반 TF-IDF 유사도
    - place / food / stay를 종합해서 Day별 코스 구성
      * place 여러 개 (max_places_per_day)
      * 첫 place 뒤에 food 1개 끼워 넣기
      * 마지막에 stay 1개 붙이기
    - region_filter_address: 주소 문자열 필터 (애월, 성산, 중문 등)
    - region_filter_subregions: ["제주 서", "서귀포 서"] 등 사분면 필터
    """

    query_text, merged_tags = build_query_from_tags(selected_tags, free_text=free_text)
    if not query_text.strip():
        return pd.DataFrame()

    candidate_df = df.copy()
    candidate_df["orig_idx"] = candidate_df.index

    # 1) 주소 기반 지역 필터
    if region_filter_address and region_filter_address.strip():
        mask_region = candidate_df["address"].str.contains(region_filter_address.strip(), na=False)
        candidate_df = candidate_df[mask_region]

    # 2) 사분면 기반 필터 (서쪽/동쪽 등)
    if region_filter_subregions:
        candidate_df = candidate_df[candidate_df["subregion"].isin(region_filter_subregions)]

    # 만약 필터 때문에 비어버리면 전체로 fallback
    if len(candidate_df) == 0:
        candidate_df = df.copy()
        candidate_df["orig_idx"] = candidate_df.index

    idx_list = candidate_df["orig_idx"].tolist()
    candidate_tfidf = tfidf_matrix[idx_list]
    query_vec = vectorizer.transform([query_text])
    cosine_sim = linear_kernel(query_vec, candidate_tfidf).flatten()
    candidate_df["similarity"] = cosine_sim

    place_df = sort_by_subregion_then_similarity(
        candidate_df[candidate_df["category_mapped"] == "place"]
    ).copy()
    food_df = sort_by_subregion_then_similarity(
        candidate_df[candidate_df["category_mapped"] == "food"]
    ).copy()
    stay_df = sort_by_subregion_then_similarity(
        candidate_df[candidate_df["category_mapped"] == "stay"]
    ).copy()

    if place_df.empty and food_df.empty and stay_df.empty:
        return pd.DataFrame()

    total_place_needed = days * max_places_per_day
    place_df = place_df.head(total_place_needed).reset_index(drop=True)

    used_indices: set = set()
    results = []

    for day in range(1, days + 1):
        start_idx = (day - 1) * max_places_per_day
        end_idx = day * max_places_per_day
        day_places = place_df.iloc[start_idx:end_idx]
        day_places = day_places[~day_places["orig_idx"].isin(used_indices)].reset_index(drop=True)

        if day_places.empty:
            continue

        dominant_sub = (
            day_places["subregion"].value_counts().idxmax()
            if not day_places["subregion"].empty
            else None
        )

        day_food_candidate = get_best_candidate(food_df, used_indices, preferred_subregion=dominant_sub)
        last_place_sub = day_places.iloc[-1]["subregion"]
        day_stay_candidate = get_best_candidate(stay_df, used_indices, preferred_subregion=last_place_sub)

        day_items = []
        for i, (_, prow) in enumerate(day_places.iterrows()):
            day_items.append(("place", prow))
            # 첫 번째 관광지 뒤에 맛집 1개 끼워 넣기
            if i == 0 and day_food_candidate is not None:
                day_items.append(("food", day_food_candidate))

        if day_stay_candidate is not None:
            day_items.append(("stay", day_stay_candidate))

        order_in_day = 0
        for cat, row in day_items:
            if pd.isna(row.get("orig_idx", np.nan)):
                continue
            if row["orig_idx"] in used_indices:
                continue

            used_indices.add(row["orig_idx"])
            order_in_day += 1

            results.append({
                "day": day,
                "order_in_day": order_in_day,
                "name": row.get("name", ""),
                "category": cat,  # place / food / stay (내부 코드)
                "address": row.get("address", ""),
                "region_city": row.get("region_city", ""),
                "subregion": row.get("subregion", ""),
                "tags": row.get("tags", ""),
                "descriptionShort": row.get("descriptionShort", ""),
                "similarity": float(row["similarity"]),
                "lat": row.get("lat"),
                "lng": row.get("lng"),
            })

    if not results:
        return pd.DataFrame()

    return pd.DataFrame(results)

# ------------------------------------------------
# 8. 자연어/키워드 파서 (고도화 버전 - /recommend_text용)
# ------------------------------------------------

# 한글 숫자 간단 매핑
KOREAN_NUM_MAP = {
    "한": 1, "하나": 1, "하루": 1,
    "두": 2, "둘": 2, "이틀": 2,
    "세": 3, "셋": 3, "사흘": 3,
    "네": 4, "넷": 4,
}

def parse_days(text: str) -> int:
    # 3박4일, 2박 3일
    m = re.search(r"(\d+)\s*박\s*(\d+)\s*일", text)
    if m:
        return max(int(m.group(2)), 1)

    # 2박 / 3박
    m = re.search(r"(\d+)\s*박", text)
    if m:
        return max(int(m.group(1)) + 1, 1)

    # 3일 / 4일
    m = re.search(r"(\d+)\s*일", text)
    if m:
        return max(int(m.group(1)), 1)

    # 한글 하루/이틀/사흘
    for k, v in KOREAN_NUM_MAP.items():
        if k in text and "일" in text:
            return v

    # 당일치기
    if "당일" in text or "당일치기" in text or "하루" in text:
        return 1

    return 1

def parse_region(text: str):
    """
    return (region_address_keyword, region_subregions)
    """
    # 우선순위: 구체 지역 → 서쪽/동쪽
    addr_keywords = {
        "제주시": "제주시",
        "서귀포": "서귀포시",
        "애월": "애월",
        "협재": "협재",
        "한림": "한림",
        "성산": "성산",
        "표선": "표선",
        "남원": "남원",
        "중문": "중문",
        "한경": "한경",
        "대정": "대정",
        "조천": "조천",
        "함덕": "함덕",
        "구좌": "구좌",
        "김녕": "김녕",
        "세화": "세화",
        "월정": "월정",
        "평대": "평대",
        "우도": "우도",
    }

    for k, v in addr_keywords.items():
        if k in text:
            return v, None

    # 서쪽/서부/서쪽코스 → 제주 서 + 서귀포 서
    if "서쪽" in text or "서부" in text:
        return None, ["제주 서", "서귀포 서"]

    # 동쪽/동부 → 제주 동 + 서귀포 동
    if "동쪽" in text or "동부" in text:
        return None, ["제주 동", "서귀포 동"]

    # 그냥 "서귀포", "제주시"는 address keyword로
    if "서귀포" in text:
        return "서귀포시", None
    if "제주시" in text:
        return "제주시", None

    return None, None

def parse_tags_from_text(text: str) -> List[str]:
    tag_map = {
        # 감성/관계
        "커플": "커플",
        "데이트": "커플",
        "연인": "커플",
        "허니문": "커플",

        "가족": "가족여행",
        "아이": "가족여행",
        "어린이": "가족여행",
        "키즈": "가족여행",

        # 분위기
        "자연": "자연",
        "바다": "자연",
        "해변": "자연",
        "오름": "자연",
        "드라이브": "자연",
        "풍경": "자연",

        "힐링": "휴식",
        "조용": "휴식",
        "한적": "휴식",
        "휴식": "휴식",
        "여유": "휴식",

        "사진": "사진",
        "인생샷": "사진",
        "감성": "사진",

        "액티비티": "액티비티",
        "체험": "액티비티",
        "레저": "액티비티",
        "서핑": "액티비티",

        "반려": "반려동물 동반",
        "애견": "반려동물 동반",

        "럭셔리": "럭셔리",
        "고급": "럭셔리",

        "오션뷰": "오션뷰",
        "바다뷰": "오션뷰",

        "풀빌라": "풀빌라",

        # 음식 관련
        "맛집": "맛집",
        "먹방": "맛집",
        "식도락": "맛집",
        "카페": "맛집",
        "흑돼지": "흑돼지",
        "고기국수": "고기국수",
        "해산물": "해산물",
        "회": "해산물",
    }

    tags = []
    for k, mapped_tag in tag_map.items():
        if k in text:
            tags.append(mapped_tag)

    tags = list(set(tags))

    # 아무 태그도 안 잡히면 기본적으로 '자연'을 넣어줘서 너무 랜덤해지지 않게
    if not tags:
        tags = ["자연"]

    return tags

def parse_user_query_advanced(query: str):
    """
    자연어/짧은 키워드 → days, tags, region(Address/Subregion), freeText
    ( /recommend_text 에서 사용 )
    """
    original = query
    text = query.strip()

    # 소문자 변환(영문용), 한글엔 영향 거의 없음
    low = text.lower()

    days = parse_days(low)
    addr_kw, subregions = parse_region(text)
    tags = parse_tags_from_text(text)

    # freeText는 TF-IDF용으로 문장 전체를 그대로 사용
    freeText = original

    return {
        "original": original,
        "days": days,
        "tags": tags,
        "region_address": addr_kw,
        "region_subregions": subregions,
        "freeText": freeText,
    }

# ------------------------------------------------
# 8-1. 챗봇용 간단 파서 (네가 쓰던 parse_chat_message 그대로)
# ------------------------------------------------

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
    기존 /chat 에서 쓰던 간단 파서.
    - tags, region_filter(정규식 패턴), region_label, days, max_places_per_day, start_time_str
    (start_time_str는 지금은 안 쓰지만 그대로 둠)
    """
    msg = (message or "").strip()

    # 1) 기본값
    tags: List[str] = []
    region_filter: Optional[str] = None
    region_label: Optional[str] = None
    days = 1
    max_places_per_day = 3
    start_time_str = "09:00"

    # 2) 일수 파싱 (2박3일 / 1박2일 / 3일 코스 등)
    m = re.search(r"(\d+)\s*박\s*(\d+)\s*일", msg)
    if m:
        days = int(m.group(2))
    else:
        m2 = re.search(r"(\d+)\s*일", msg)
        if m2:
            d = int(m2.group(1))
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

    # 5) 시간대 (지금은 사용 X, 값만 유지)
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
# 8-2. 코스 전용 룰 기반 응답 (동/서/남/북/2박3일)
# ------------------------------------------------

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
    """
    if not user_message:
        return None

    msg_no_space = user_message.replace(" ", "")
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
# 9. Pydantic 모델 (Request / Response)
# ------------------------------------------------

class RecommendRequest(BaseModel):
    tags: List[str] = []
    region: Optional[str] = None           # 주소 필터 (ex. 제주시, 서귀포시, 애월, 성산...)
    days: int = 1
    max_places_per_day: int = 3
    freeText: Optional[str] = ""
    subregions: Optional[List[str]] = None # ["제주 서", "서귀포 서"] 등

class ItineraryItem(BaseModel):
    day: int
    order_in_day: int
    name: str
    category: str          # "관광" / "식사" / "숙소"  ← 사람 읽는 라벨
    address: str
    region_city: str
    subregion: str
    tags: str
    descriptionShort: str
    similarity: float
    lat: Optional[float]
    lng: Optional[float]

class DayPlan(BaseModel):
    day: int
    items: List[ItineraryItem]

class RecommendResponse(BaseModel):
    days: List[DayPlan]

# 자연어/키워드용
class RecommendTextRequest(BaseModel):
    query: str
    max_places_per_day: int = 3

class ParsedQuery(BaseModel):
    original: str
    days: int
    tags: List[str]
    region_address: Optional[str]
    region_subregions: Optional[List[str]]
    freeText: str

class RecommendTextResponse(BaseModel):
    parsed: ParsedQuery
    days: List[DayPlan]
    message: str           # ✅ 챗봇에 그대로 쓸 한국어 문장

# 챗봇용
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    itinerary: RecommendResponse

# ------------------------------------------------
# 10. DataFrame -> Response 변환
# ------------------------------------------------

def itinerary_df_to_days(itinerary_df: pd.DataFrame) -> List[DayPlan]:
    if itinerary_df.empty:
        return []

    days_result: List[DayPlan] = []

    for day in sorted(itinerary_df["day"].unique()):
        day_df = itinerary_df[itinerary_df["day"] == day].copy()
        day_df = day_df.sort_values("order_in_day")

        items: List[ItineraryItem] = []
        for _, row in day_df.iterrows():
            raw_cat = str(row["category"])
            label = CATEGORY_LABEL.get(raw_cat, "기타")  # place → 관광 식으로 변환

            items.append(
                ItineraryItem(
                    day=int(row["day"]),
                    order_in_day=int(row["order_in_day"]),
                    name=str(row["name"]),
                    category=label,
                    address=str(row["address"]),
                    region_city=str(row["region_city"]),
                    subregion=str(row["subregion"]),
                    tags=str(row["tags"]),
                    descriptionShort=str(row["descriptionShort"]),
                    similarity=float(row["similarity"]),
                    lat=float(row["lat"]) if not pd.isna(row["lat"]) else None,
                    lng=float(row["lng"]) if not pd.isna(row["lng"]) else None,
                )
            )
        days_result.append(DayPlan(day=int(day), items=items))

    return days_result

def itinerary_df_to_recommend_response(itinerary_df: pd.DataFrame) -> RecommendResponse:
    return RecommendResponse(days=itinerary_df_to_days(itinerary_df))

# ------------------------------------------------
# 11. /recommend (구조화된 요청용)
# ------------------------------------------------

@app.post("/recommend", response_model=RecommendResponse)
def recommend_endpoint(req: RecommendRequest):
    itinerary_df = recommend_itinerary_no_time(
        selected_tags=req.tags,
        region_filter_address=req.region,
        region_filter_subregions=req.subregions,
        days=req.days,
        max_places_per_day=req.max_places_per_day,
        free_text=req.freeText or "",
    )
    return itinerary_df_to_recommend_response(itinerary_df)

# ------------------------------------------------
# 12. /recommend_text (자연어/키워드 전용)
# ------------------------------------------------

def format_itinerary_message(parsed: ParsedQuery, days: List[DayPlan]) -> str:
    """
    /recommend_text 용 한국어 요약 문장
    (장소 이름 옆에 category는 한국어 라벨로 들어감)
    """
    if not days:
        return (
            f'요청하신 "{parsed.original}" 조건에 딱 맞는 코스를 찾지 못했어요 😢\n'
            "여행 일수나 지역, 분위기 조건을 조금만 완화해서 다시 알려주시면\n"
            "더 잘 맞는 일정을 추천해 드릴게요!"
        )

    header = f'요청하신 "{parsed.original}" 조건을 바탕으로 코스를 만들어 봤어요 😊'

    days_str = f"{parsed.days}일 일정"
    mood_tags = [t for t in parsed.tags if t not in ["맛집"]]
    if mood_tags:
        mood_str = " / ".join(mood_tags)
        subheader = f"{days_str} · {mood_str} 분위기"
    else:
        subheader = days_str

    body_lines: List[str] = []
    for day_plan in sorted(days, key=lambda d: d.day):
        segments = []
        for item in sorted(day_plan.items, key=lambda x: x.order_in_day):
            # 이름만 쓰고 싶으면 f"{item.name}" 만 남겨도 됨
            segments.append(f"{item.name}({item.category})")
        line = f"{day_plan.day}일차 : " + " → ".join(segments)
        body_lines.append(line)

    footer = "세부 일정은 순서대로 참고하시고, 시간은 자유롭게 조정해 주세요!"

    return header + "\n" + subheader + "\n" + "\n".join(body_lines) + "\n" + footer

@app.post("/recommend_text", response_model=RecommendTextResponse)
def recommend_text_endpoint(req: RecommendTextRequest):
    parsed_raw = parse_user_query_advanced(req.query)

    itinerary_df = recommend_itinerary_no_time(
        selected_tags=parsed_raw["tags"],
        region_filter_address=parsed_raw["region_address"],
        region_filter_subregions=parsed_raw["region_subregions"],
        days=parsed_raw["days"],
        max_places_per_day=req.max_places_per_day,
        free_text=parsed_raw["freeText"],
    )

    days_plans = itinerary_df_to_days(itinerary_df)

    parsed_model = ParsedQuery(
        original=parsed_raw["original"],
        days=parsed_raw["days"],
        tags=parsed_raw["tags"],
        region_address=parsed_raw["region_address"],
        region_subregions=parsed_raw["region_subregions"],
        freeText=parsed_raw["freeText"],
    )

    message = format_itinerary_message(parsed_model, days_plans)

    return RecommendTextResponse(
        parsed=parsed_model,
        days=days_plans,
        message=message,
    )

# ------------------------------------------------
# 13. summarize_itinerary_for_chat + /chat 엔드포인트
# ------------------------------------------------

def summarize_itinerary_for_chat(resp: RecommendResponse, ctx: dict, original_message: str) -> str:
    """
    추천 결과 + 파싱된 조건(ctx)을 바탕으로
    사람이 읽기 좋은 한글 설명을 만든다.
    (각 장소의 시간 정보 없이 순서만 보여줌)
    """
    if not resp.days:
        return "조건에 맞는 코스를 찾지 못했어요. 날짜/지역/원하는 분위기를 조금 더 자세히 알려줄래요?"

    desc_parts: List[str] = []

    # 1) 사용자가 보낸 문장
    if original_message:
        desc_parts.append(f"요청하신 \"{original_message}\" 조건을 바탕으로 코스를 만들어 봤어요 😊")

    # 2) 파싱된 조건 간단 요약
    cond_parts: List[str] = []
    days = ctx.get("days")
    if days:
        cond_parts.append(f"{days}일 일정")

    region_label = ctx.get("region_label")
    if region_label:
        cond_parts.append(region_label)

    tags = ctx.get("tags") or []
    if tags:
        show_tags = tags[:3]
        cond_parts.append(" / ".join(show_tags) + " 분위기")

    if cond_parts:
        desc_parts.append(" · ".join(cond_parts))

    # 3) 일자별 코스 요약
    lines: List[str] = []
    for day_plan in resp.days:
        items_text = " → ".join(
            f"{item.name}({item.category})"
            for item in day_plan.items
        )
        lines.append(f"{day_plan.day}일차 : {items_text}")

    desc_parts.extend(lines)
    desc_parts.append("세부 일정은 순서대로 참고해서 시간은 자유롭게 조정해 주세요!")

    return "\n".join(desc_parts)

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    1) 룰 기반 코스(동/서/남/북, 2박3일) 먼저 체크
    2) 아니면 parse_chat_message로 파싱 후 recommend_itinerary_no_time 사용
    """
    # 1) 동/서/남/북/2박3일 코스 룰 기반 응답
    rb_answer = rule_based_course_answer(req.message)
    if rb_answer:
        empty_resp = RecommendResponse(days=[])
        return ChatResponse(reply=rb_answer, itinerary=empty_resp)

    # 2) 일반 코스 추천 로직 (네가 쓰던 parse_chat_message + 새 recommend_itinerary_no_time)
    ctx = parse_chat_message(req.message)

    itinerary_df = recommend_itinerary_no_time(
        selected_tags=ctx["tags"],
        region_filter_address=ctx["region_filter"],   # 정규식 패턴이지만 str.contains 기본이 regex라 동작
        region_filter_subregions=None,
        days=ctx["days"],
        max_places_per_day=ctx["max_places_per_day"],
        free_text=req.message,
    )

    resp = itinerary_df_to_recommend_response(itinerary_df)
    reply_text = summarize_itinerary_for_chat(resp, ctx, req.message)

    return ChatResponse(
        reply=reply_text,
        itinerary=resp,
    )

# ------------------------------------------------
# 실행 방법 (터미널)
# ------------------------------------------------
# uvicorn main:app --reload --port 8000
# http://127.0.0.1:8000/docs
#  - POST /recommend_text : "제주 서쪽 당일치기 코스 추천해줘"
#  - POST /chat : 챗봇처럼 대화 ("커플 2박3일 서귀포 동쪽 코스 추천해줘")
