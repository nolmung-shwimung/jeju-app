// src/components/PlaceDetail.jsx
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PLACES } from "../data/places";
import "../styles/PlaceDetail.css";

function PlaceDetail() {
  const { id } = useParams();          // /places/:id 에서 id 가져오기
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const place = PLACES[id];

  // 페이지 타이틀 세팅
  useEffect(() => {
    if (place) {
      document.title = `${place.name} - 제주 여행`;
    }
  }, [place]);

  // 구글 지도 초기화
  useEffect(() => {
    if (!place) return;
    if (!window.google || !mapRef.current) return;

    const center = { lat: place.lat, lng: place.lng };

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
    });

    new window.google.maps.Marker({
      position: center,
      map,
      title: place.name,
    });
  }, [place]);

  if (!place) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>해당 장소를 찾을 수 없습니다.</p>
        <button onClick={() => navigate(-1)}>뒤로가기</button>
      </div>
    );
  }

  return (
    <div className="place-page">
      {/* 상단 이미지 영역 */}
      <div className="place-hero">
        <div className="place-top-bar">
          <button className="place-back-btn" onClick={() => navigate(-1)}>
            ← 뒤로가기
          </button>
        </div>

        <img src={place.image} alt={place.name} />
        <div className="place-hero-overlay" />

        <div className="place-hero-content">
          <span className="place-badge">{place.type}</span>
          <div className="place-title-row">
            <h1 className="place-title">{place.name}</h1>
            <button className="place-favorite-btn">♡</button>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="place-content">
        <div className="place-info-layout">
          {/* 상세 정보 */}
          <div>
            <div className="place-section-title">상세 정보</div>
            <div className="place-info-card">
              <div className="place-info-row">
                <div className="place-info-icon">📍</div>
                <div>
                  <div className="place-info-label">주소</div>
                  <div className="place-info-text">{place.address}</div>
                </div>
              </div>

              <div className="place-info-row">
                <div className="place-info-icon">⏰</div>
                <div>
                  <div className="place-info-label">운영시간</div>
                  <div className="place-info-text">{place.time}</div>
                </div>
              </div>

              <div className="place-info-row">
                <div className="place-info-icon">☎️</div>
                <div>
                  <div className="place-info-label">연락처</div>
                  <div className="place-info-text">{place.tel}</div>
                </div>
              </div>

              <div className="place-info-row">
                <div className="place-info-icon">🎫</div>
                <div>
                  <div className="place-info-label">입장료</div>
                  <div className="place-info-text">{place.fee}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 위치 안내 (지도) */}
          <div>
            <div className="place-section-title">위치 안내</div>
            <div className="place-map-card">
              <div ref={mapRef} className="place-map" />
            </div>
          </div>
        </div>

        {/* 태그 */}
        <div className="place-tag-section">
          <div className="place-section-title">관련 태그</div>
          <div className="place-tag-list">
            {place.tags.map((tag) => (
              <span key={tag} className="place-tag">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlaceDetail;
