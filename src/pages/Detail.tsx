// src/pages/Detail.tsx
import MapView from "../components/MapView";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useFavorites } from "../hooks/useFavorites";

import {
  fetchReviews,
  addReview,
  updateReviewText,
  deleteReviewById,
  type Review,
} from "../api/reviews";
import { formatTimeAgo } from "../utils/timeAgo";
import { useAuth } from "../contexts/AuthContext";

interface Spot {
  id: string | null;
  name: string;
  category: string; // "attraction" | "stay" | "food" 등
  address: string | null;
  tags?: string[] | string | null;
  thumbnailUrl: string | null;
  descriptionShort: string | null;
  openingHours: string | null;
  phone: string | null;
  priceInfo: string | null;
  lat: number;
  lng: number;
}

// tags를 항상 string[]로 변환하는 헬퍼
const getTagArray = (raw: Spot["tags"]): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((t) => (t ?? "").trim())
      .filter((t) => t.length > 0);
  }
  return String(raw)
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
};

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(true);

  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 내 리뷰 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // 이 장소에 대해 로그인한 사용자가 이미 남긴 평가 여부 (rating만 기준)
  const currentUserRating: "up" | "down" | "none" = (() => {
    if (!user) return "none";
    const myReview = reviews.find(
      (r) => r.userId === user.uid && r.rating !== "none"
    );
    return myReview?.rating ?? "none";
  })();

  // 따봉/비추천 숫자
  const upCount = reviews.filter((r) => r.rating === "up").length;
  const downCount = reviews.filter((r) => r.rating === "down").length;

  // 화면에 보여줄 리뷰 목록 (텍스트 있는 것만)
  const visibleReviews = reviews.filter(
    (r) => r.text && r.text.trim().length > 0
  );

  const reloadReviews = async (spotId: string) => {
    const list = await fetchReviews(spotId);
    setReviews(list);
  };

  // 장소 로드
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/data/jeju_spots.json");
        const data: Spot[] = await res.json();

        const withThumbs = data.map((s) => {
          const localImg = s.name ? `/spotimage/${s.name}.jpg` : null;
          return {
            ...s,
            thumbnailUrl: localImg || s.thumbnailUrl || null,
          };
        });

        const found = withThumbs.find((s) => String(s.id) === String(id));
        setSpot(found ?? null);
      } catch (e) {
        console.error("jeju_spots.json 로드 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // 리뷰 로드
  useEffect(() => {
    const loadReviews = async () => {
      if (!id) return;
      try {
        setReviewsLoading(true);
        await reloadReviews(String(id));
      } catch (e) {
        console.error("리뷰 로드 실패:", e);
      } finally {
        setReviewsLoading(false);
      }
    };

    loadReviews();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        데이터를 불러오는 중입니다...
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        해당 장소 정보를 찾을 수 없습니다.
      </div>
    );
  }

  const fav = isFavorite(spot.id);
  const tags = getTagArray(spot.tags);

  const handleToggleFavorite = () => {
    if (!spot.id) return;
    toggleFavorite({
      id: String(spot.id),
      name: spot.name,
      category: spot.category,
      thumbnailUrl: spot.thumbnailUrl,
    });
  };

  const renderExtraInfo = () => {
    if (spot.category === "stay") {
      return (
        <>
          <span className="mr-1">⭐</span>
          <span>{spot.priceInfo || "등급 정보 없음"}</span>
        </>
      );
    }

    if (spot.category === "food") {
      return (
        <>
          <span className="mr-1">🍽</span>
          <span>{spot.priceInfo || "부가 정보 없음"}</span>
        </>
      );
    }

    return (
      <>
        <span className="mr-1">💰</span>
        <span>{spot.priceInfo || "요금 정보 없음"}</span>
      </>
    );
  };

  // ✅ 따봉/비추천 클릭: 숫자만 올라감 (text: "")
  const handleRate = async (value: "up" | "down") => {
    if (!user) {
      alert("평가하려면 로그인이 필요합니다.");
      return;
    }
    if (!id) return;

    if (currentUserRating !== "none") {
      alert("이미 이 장소를 평가하셨습니다.");
      return;
    }

    try {
      setSubmitting(true);

      await addReview(String(id), {
        userId: user.uid,
        userName: user.displayName || "익명",
        userPhotoUrl: user.photoURL,
        text: "",
        rating: value,
      });

      await reloadReviews(String(id));
    } catch (e) {
      console.error("평가 저장 실패:", e);
      alert("평가 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ 리뷰 작성: 따봉 숫자에는 영향 없음 (rating: "none")
  const handleSubmitReview = async () => {
    if (!user) {
      alert("리뷰를 작성하려면 로그인이 필요합니다.");
      return;
    }
    if (!id) return;

    const trimmed = newText.trim();
    if (!trimmed) return;

    try {
      setSubmitting(true);
      await addReview(String(id), {
        userId: user.uid,
        userName: user.displayName || "익명",
        userPhotoUrl: user.photoURL,
        text: trimmed,
        rating: "none",
      });

      setNewText("");
      await reloadReviews(String(id));
    } catch (e) {
      console.error("리뷰 작성 실패:", e);
      alert("리뷰 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ 내 리뷰 수정 시작
  const startEditReview = (review: Review) => {
    if (!user || review.userId !== user.uid) return;
    setEditingId(review.id);
    setEditingText(review.text);
  };

  // ✅ 수정 저장
  const saveEditReview = async () => {
    if (!user || !id || !editingId) return;

    const trimmed = editingText.trim();
    if (!trimmed) {
      alert("내용을 입력해 주세요.");
      return;
    }

    try {
      setSubmitting(true);
      await updateReviewText(String(id), editingId, trimmed);
      await reloadReviews(String(id));
      setEditingId(null);
      setEditingText("");
    } catch (e) {
      console.error("리뷰 수정 실패:", e);
      alert("리뷰 수정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ 수정 취소
  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  // ✅ 리뷰 삭제
  const handleDeleteReview = async (review: Review) => {
    if (!user || review.userId !== user.uid) {
      alert("본인이 작성한 리뷰만 삭제할 수 있습니다.");
      return;
    }
    if (!id) return;

    const ok = window.confirm("리뷰를 삭제하시겠습니까?");
    if (!ok) return;

    try {
      setSubmitting(true);
      await deleteReviewById(String(id), review.id);
      await reloadReviews(String(id));
      if (editingId === review.id) {
        setEditingId(null);
        setEditingText("");
      }
    } catch (e) {
      console.error("리뷰 삭제 실패:", e);
      alert("리뷰 삭제에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8 space-y-8">
      {/* 상단 이미지 */}
      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
          {spot.thumbnailUrl ? (
            <img
              src={spot.thumbnailUrl}
              alt={spot.name}
              className="w-full max-h-[420px] object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-gray-400 py-16">사진 공간</span>
          )}
        </div>
      </div>

      {/* 기본 정보 + 찜 버튼 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{spot.name}</h1>

          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 shadow-sm ${
              fav ? "bg-red-500 text-white" : "bg-white border text-gray-600"
            }`}
          >
            <span>{fav ? "♥" : "♡"}</span>
            <span>{fav ? "찜 해제" : "찜하기"}</span>
          </button>
        </div>

        {/* 태그 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 한 줄 소개 */}
        {spot.descriptionShort && (
          <p className="text-sm text-gray-700 leading-relaxed mt-2">
            {spot.descriptionShort}
          </p>
        )}
      </section>

      {/* 상세 정보 + 지도 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 p-4 rounded-xl bg-gray-50">
          <h2 className="font-semibold mb-2">상세 정보</h2>

          <div className="space-y-2 text-sm text-gray-700">
            <div>
              <span className="mr-1">📍</span>
              <span>{spot.address || "주소 정보 없음"}</span>
            </div>

            <div>
              <span className="mr-1">⏰</span>
              <span>{spot.openingHours || "운영시간 정보 없음"}</span>
            </div>

            <div>
              <span className="mr-1">📞</span>
              <span>{spot.phone || "연락처 정보 없음"}</span>
            </div>

            <div>{renderExtraInfo()}</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
          <MapView lat={spot.lat} lng={spot.lng} name={spot.name} />
        </div>
      </section>

      {/* 평가 섹션 */}
      <section className="p-4 rounded-xl bg-white border space-y-3">
        <h2 className="font-semibold text-lg">
          이{" "}
          {spot.category === "stay"
            ? "숙소"
            : spot.category === "food"
            ? "식당"
            : "관광지"}{" "}
          마음에 드셨나요?
        </h2>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleRate("up")}
            className={`px-4 py-2 rounded-full border flex items-center gap-2 text-sm ${
              currentUserRating === "up"
                ? "bg-green-500 text-white border-green-500"
                : "bg-white text-gray-700"
            }`}
          >
            <span>👍</span>
            <span>추천</span>
            <span className="text-xs opacity-80">({upCount})</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleRate("down")}
            className={`px-4 py-2 rounded-full border flex items-center gap-2 text-sm ${
              currentUserRating === "down"
                ? "bg-red-500 text-white border-red-500"
                : "bg-white text-gray-700"
            }`}
          >
            <span>👎</span>
            <span>비추천</span>
            <span className="text-xs opacity-80">({downCount})</span>
          </button>

          <span className="text-xs text-gray-500">
            (로그인 후 한 번만 평가할 수 있어요)
          </span>
        </div>
      </section>

      {/* 리뷰 섹션 */}
      <section className="p-4 rounded-xl bg-gray-50 space-y-4">
        <h2 className="font-semibold text-lg">리뷰</h2>

        {/* 리뷰 작성 */}
        <div className="bg-white rounded-xl border p-3 space-y-2">
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            rows={3}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={
              user
                ? "리뷰를 작성해 주세요. (다른 사람들에게 큰 도움이 됩니다!)"
                : "로그인 후 리뷰를 작성할 수 있습니다."
            }
            disabled={!user || submitting}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={!user || submitting || !newText.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white disabled:opacity-50"
            >
              {submitting ? "등록 중..." : "리뷰 등록"}
            </button>
          </div>
        </div>

        {/* 리뷰 목록 */}
        <div className="space-y-3">
          {reviewsLoading ? (
            <p className="text-sm text-gray-500">리뷰를 불러오는 중입니다...</p>
          ) : visibleReviews.length === 0 ? (
            <p className="text-sm text-gray-500">
              아직 작성된 리뷰가 없습니다. 첫 번째 리뷰를 남겨보세요!
            </p>
          ) : (
            visibleReviews.map((r) => {
              const isMine = user && r.userId === user.uid;
              const isEditing = editingId === r.id;

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border px-3 py-2 flex gap-3"
                >
                  {/* 프로필 이미지 */}
                  <div className="flex-shrink-0">
                    {r.userPhotoUrl ? (
                      <img
                        src={r.userPhotoUrl}
                        alt={r.userName}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-pink-500 flex items-center justify-center text-xs text-white">
                        {r.userName.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">
                        {r.userName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(r.createdAt)}
                      </span>
                    </div>

                    {/* 수정 중일 때 */}
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                          rows={3}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          disabled={submitting}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={submitting}
                            className="px-3 py-1.5 text-xs rounded-lg border bg-white"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={saveEditReview}
                            disabled={submitting || !editingText.trim()}
                            className="px-3 py-1.5 text-xs rounded-lg bg-blue-500 text-white disabled:opacity-50"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">
                          {r.text}
                        </p>

                          {/* 내 리뷰인 경우에만 수정/삭제 버튼 */}
                        {isMine && (
                          <div className="flex gap-2 mt-1 justify-end">
                            <button
                              type="button"
                              onClick={() => startEditReview(r)}
                              className="px-2 py-1 text-xs rounded border bg-white text-gray-600"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(r)}
                              className="px-2 py-1 text-xs rounded border bg-red-50 text-red-500"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
