import { useNavigate, useSearchParams } from "react-router-dom";
import { TAGS } from "../data/tags";

export default function TagChips({ compact=false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const active = (sp.get("tags") || "").split(",").filter(Boolean);

  const toggle = (key: string) => {
    const set = new Set(active);
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    const next = Array.from(set).join(",");
    navigate(`/list?tags=${encodeURIComponent(next)}`);
  };
  

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-4"}`}>
      {TAGS.map(({ key, icon }) => {
        const on = active.includes(key);
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
