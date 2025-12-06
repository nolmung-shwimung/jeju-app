// src/App.tsx
import { Routes, Route, Link, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import List from "./pages/List";
import Detail from "./pages/Detail";
import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import { useAuth } from "./contexts/AuthContext";
import Chatbot from "./components/Chatbot";

export default function App() {
  const { user } = useAuth();

  const navClass =
    ({ isActive }: { isActive: boolean }) =>
      `px-2 py-1 rounded-md ${
        isActive
          ? "text-black font-semibold"
          : "text-gray-600 hover:text-gray-900"
      }`;

  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="w-full px-4 sm:px-6 lg:px-12 py-3 flex items-center gap-6">
          <Link to="/" className="font-bold text-lg tracking-tight">
            놀멍쉬멍
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            <NavLink to="/list?cat=attraction" className={navClass}>
              관광지
            </NavLink>
            <NavLink to="/list?cat=stay" className={navClass}>
              숙박
            </NavLink>
            <NavLink to="/list?cat=food" className={navClass}>
              음식
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden sm:inline text-sm text-gray-700 max-w-[160px] truncate">
                {user.displayName || user.email}
              </span>
            )}

            {user ? (
              <Link
                to="/mypage"
                className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90"
              >
                마이페이지
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/list" element={<List />} />
          <Route path="/detail/:id" element={<Detail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mypage" element={<MyPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="w-full px-4 sm:px-6 lg:px-12 py-6 text-sm text-gray-500">
          © {new Date().getFullYear()} 제주대학교 캡스톤디자인2 놀멍쉬멍
        </div>
      </footer>

      {/* 화면 오른쪽 아래 챗봇 */}
      <Chatbot />
    </div>
  );
}
