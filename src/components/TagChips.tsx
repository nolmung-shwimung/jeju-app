import { useNavigate, useSearchParams } from "react-router-dom";
import { TAGS } from "../data/tags";

export default function TagChips({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  // 🔹 이제 "현재 선택된 태그 1개"만 관리
  const activeKey = sp.get("tags") || "";

  const toggle = (key: string) => {
    const params = new URLSearchParams(sp);

    if (activeKey === key) {
      // 이미 선택된 태그면 → 선택 해제
      params.delete("tags");
    } else {
      // 다른 태그를 누르면 → 그 태그만 선택
      params.set("tags", key);
    }

    const search = params.toString();
    navigate(`/list${search ? `?${search}` : ""}`);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-4"}`}>
      {TAGS.map(({ key, icon }) => {
        const on = activeKey === key;
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`px-3 py-1.5 rounded-xl border text-sm flex items-center gap-1
              ${on ? "bg-black text-white border-black" : "bg-white text-gray-800"} 
              hover:shadow-sm`}
          >
            <span>{icon}</span>
            <span>{key}</span>
          </button>
        );
      })}
    </div>
  );
}
