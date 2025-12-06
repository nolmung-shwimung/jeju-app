// src/data/places.ts

export interface Place {
  id: string;          
  name: string;        
  category: string;    
  imageUrl: string;    
  address: string;
  openingHours: string;
  phone: string;
  priceInfo?: string;
  tags: string[];
  lat: number;
  lng: number;
}

export const PLACES: Place[] = [
  {
    id: "sungsan-ilchulbong",
    name: "성산일출봉",
    category: "관광지",
    imageUrl: "/images/sungsan.jpg",
    address: "제주특별자치도 서귀포시 성산읍 성산리",
    openingHours: "07:00 - 20:00 (연중무휴)",
    phone: "064-783-0959",
    priceInfo: "성인 5,000원 / 청소년 2,500원 / 어린이 2,500원",
    tags: ["일출", "트레킹", "세계자연유산"],
    lat: 33.4589,
    lng: 126.9425,
  },
  {
    id: "hamdeok-beach",
    name: "함덕해수욕장",
    category: "관광지",
    imageUrl: "/images/hamdeok.jpg",
    address: "제주특별자치도 제주시 조천읍 함덕리",
    openingHours: "24시간 (일부 시설 상이)",
    phone: "064-728-3989",
    priceInfo: "무료 (부대 시설 별도)",
    tags: ["바다", "카페거리", "드라이브"],
    lat: 33.5439,
    lng: 126.6720,
  },
  // 추가
];
