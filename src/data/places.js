// src/data/places.js

export const PLACES = {
  seongsan: {
    id: "seongsan",
    type: "관광지",
    name: "성산일출봉",
    address: "제주특별자치도 서귀포시 성산읍 성산리",
    time: "07:00 - 20:00 (연중무휴)",
    tel: "064-783-0959",
    fee: "성인 5,000원 / 청소년 2,500원 / 어린이 2,500원",
    tags: ["일출", "트레킹", "세계자연유산"],
    image: "/images/seongsan.jpg", // public/images 안에 넣으면 이렇게
    lat: 33.4588,
    lng: 126.941,
  },

  hyeopjae: {
    id: "hyeopjae",
    type: "관광지",
    name: "협재해수욕장",
    address: "제주특별자치도 제주시 한림읍 협재리",
    time: "상시 개방",
    tel: "064-000-0000",
    fee: "무료",
    tags: ["바다", "노을", "힐링"],
    image: "/images/hyeopjae.jpg",
    lat: 33.3944,
    lng: 126.2395,
  },

  // ...추가 관광지들 계속 여기다
};
