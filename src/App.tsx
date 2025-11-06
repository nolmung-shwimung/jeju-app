// src/App.tsx
import { Routes, Route, Link, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import List from "./pages/List";
import Detail from "./pages/Detail";
import Login from "./pages/Login";

export default function App() {
  const navClass =
    ({ isActive }: { isActive: boolean }) =>
      `px-2 py-1 rounded-md ${
        isActive ? "text-black font-semibold" : "text-gray-600 hover:text-gray-900"
      }`;

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      {/* Header (full-bleed) */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="container mx-auto max-w-screen-2xl px-4 py-3 flex items-center gap-6">
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

          <div className="ml-auto">
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90"
            >
              로그인
            </Link>
          </div>
        </div>
      </header>

      {/* Main fills viewport */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/list" element={<List />} />
          <Route path="/detail/:id" element={<Detail />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>

      {/* Footer (full-bleed) */}
      <footer className="border-t">
        <div className="container mx-auto max-w-screen-2xl px-4 py-6 text-sm text-gray-500">
          © {new Date().getFullYear()} 제주대학교 캡스톤디자인 놀멍쉬멍
        </div>
      </footer>
    </div>
  );
}
