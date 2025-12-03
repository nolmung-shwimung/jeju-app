// src/pages/Login.tsx
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // 🔹 로그인 상태 확인

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth(); // 🔹 로그인 여부 확인

  // 🔥 이미 로그인되어 있으면 로그인 페이지 대신 마이페이지로 이동
  if (user) {
    return <Navigate to="/mypage" replace />;
  }

  const googleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("로그인 성공:", user);

      navigate("/mypage"); // 🔥 로그인 후 마이페이지로 이동
    } catch (err) {
      console.error("로그인 실패:", err);
    }
  };

  return (
    <div className="min-h-svh w-full bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm sm:max-w-md rounded-2xl border bg-white shadow-sm p-6 sm:p-8">
        <h1 className="text-center text-xl font-bold">로그인</h1>

        {/* 🔹 구글 로그인 버튼 */}
        <button
          type="button"
          onClick={googleLogin}
          className="mt-6 w-full rounded-xl border py-3 px-4 flex items-center justify-center gap-2 hover:bg-gray-50 transition"
          aria-label="구글 계정으로 로그인"
        >
          <span className="h-5 w-5 rounded-full border grid place-items-center text-xs">
            G
          </span>
          <span className="font-medium">구글 계정으로 로그인</span>
        </button>

        {/* 구분선 */}
        <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          또는
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        {/* 회원가입 버튼 (사실 로그인과 동일) */}
        <button
          type="button"
          onClick={googleLogin}
          className="w-full rounded-xl border py-3 px-4 hover:bg-gray-50 transition"
        >
          구글 계정으로 회원가입
        </button>

        <p className="mt-6 text-center text-xs text-gray-400">
          © 2025 제주대학교 캡스톤디자인2 놀멍쉬멍
        </p>
      </div>
    </div>
  );
}
