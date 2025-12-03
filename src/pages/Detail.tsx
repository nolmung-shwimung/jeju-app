// src/pages/Detail.tsx
import { useParams } from "react-router-dom";

export default function Detail() {
  const { id } = useParams();

  return (
    // 🔹 화면 전체 사용
    <div className="min-h-svh w-full bg-white px-4 py-8 flex justify-center">
      {/* 🔹 안쪽 콘텐츠는 적당한 최대 폭만 제한 */}
      <div className="w-full max-w-5xl space-y-6">
        <div className="aspect-[16/9] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
          상세 이미지(슬라이더 자리)
        </div>
        <h1 className="text-3xl font-bold">상세 제목 #{id}</h1>
        <div className="p-6 border rounded-xl bg-gray-50 text-gray-600">
          상세 설명/주소/태그/위시리스트 버튼 등이 들어옵니다.
        </div>
      </div>
    </div>
  );
}
