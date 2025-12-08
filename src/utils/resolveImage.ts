// src/utils/resolveImage.ts

// 파일명에서 공백·특수문자 제거 후 비교하기 위한 정규화 함수
export const normalizeName = (name: string): string =>
    name
      .replace(/\s+/g, "")         // 모든 공백 제거
      .replace(/[^\w가-힣]/g, "")  // 특수문자 제거
      .toLowerCase();              // 소문자 처리
  
  /**
   * spot.name 을 기반으로 이미지 파일명을 자동으로 찾는 함수
   * public/spotimage 폴더 기준으로 확장자는 JPG 로 통일
   */
  export const resolveImageUrl = (rawName: string | null): string | null => {
    if (!rawName) return null;
  
    const normalized = normalizeName(rawName);
  
    // 기본 규칙: `공백·특문 제거한 이름.jpg`
    return `/spotimage/${normalized}.jpg`;
  };
  