// src/utils/timeAgo.ts
export const formatTimeAgo = (date: Date): string => {
    const now = new Date().getTime();
    const diff = Math.floor((now - date.getTime()) / 1000); // 초
  
    if (diff < 60) return "방금 전";
  
    const min = Math.floor(diff / 60);
    if (min < 60) return `${min}분 전`;
  
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}시간 전`;
  
    const day = Math.floor(hour / 24);
    if (day < 7) return `${day}일 전`;
  
    const week = Math.floor(day / 7);
    if (week < 5) return `${week}주 전`;
  
    const month = Math.floor(day / 30);
    if (month < 12) return `${month}개월 전`;
  
    const year = Math.floor(day / 365);
    return `${year}년 전`;
  };
  