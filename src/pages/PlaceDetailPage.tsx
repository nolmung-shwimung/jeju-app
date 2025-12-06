// src/pages/PlaceDetailPage.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import MapView from "../components/MapView";
import "./PlaceDetailPage.css";

const PlaceDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // 지금은 예시로 성산일출봉 고정 데이터 사용
  // 나중에 id에 따라 데이터 바꾸면 됨!
  const place = {
    name: "성산일출봉",
    category: "관광지",
    imageUrl: "/images/sungsan.jpg", // public/images/sungsan.jpg 넣어두면 좋아
    address: "제주특별자치도 서귀포시 성산읍 성산리",
    openingHours: "07:00 - 20:00 (연중무휴)",
    phone: "064-783-0959",
    priceInfo: "성인 5,000원 / 청소년 2,500원 / 어린이 2,500원",
    tags: ["일출", "트레킹", "세계자연유산"],
    lat: 33.4589,
    lng: 126.9425,
  };

  return (
    <div className="detail-page">
      {/* 상단 큰 이미지 영역 */}
      <div className="detail-hero">
        <img
          src={place.imageUrl}
          alt={place.name}
          className="detail-hero-image"
        />

        <button
          className="detail-back-btn"
          onClick={() => navigate(-1)}
        >
          ← 뒤로가기
        </button>

        <div className="detail-hero-info">
          <span className="detail-category-pill">{place.category}</span>
          <h1 className="detail-title">{place.name}</h1>
          <button className="detail-like-btn" aria-label="즐겨찾기">
            ♡
          </button>
        </div>
      </div>

      {/* 본문 레이아웃 */}
      <main className="detail-main">
        <section className="detail-section">
          <h2 className="section-title">상세 정보</h2>

          <div className="info-card">
            <div className="info-label">📍 주소</div>
            <div className="info-content">{place.address}</div>
          </div>

          <div className="info-card">
            <div className="info-label">🕒 운영시간</div>
            <div className="info-content">{place.openingHours}</div>
          </div>

          <div className="info-card">
            <div className="info-label">📞 연락처</div>
            <div className="info-content">{place.phone}</div>
          </div>

          <div className="info-card">
            <div className="info-label">🎫 입장료</div>
            <div className="info-content">{place.priceInfo}</div>
          </div>
        </section>

        <section className="detail-section">
          <h2 className="section-title">위치 안내</h2>
          <div className="map-card">
            <MapView lat={place.lat} lng={place.lng} />
          </div>
        </section>
      </main>

      {/* 태그 영역 */}
      <section className="detail-tags">
        <h3 className="section-title">관련 태그</h3>
        <div className="tag-list">
          {place.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              #{tag}
            </span>
          ))}
        </div>
      </section>

      {/* 푸터 문구 */}
      <footer className="detail-footer">
        제주도 여행 플래너. 제주도에서 완벽한 여행을 위한 당신의 파트너입니다.
      </footer>
    </div>
  );
};

export default PlaceDetailPage;
