// src/components/TagChips.tsx
import { useNavigate, useSearchParams } from "react-router-dom";
import { TAGS, STAY_TAGS, FOOD_TAGS } from "../data/tags";

interface TagChipsProps {
  compact?: boolean;
  category?: string;
}

export default function TagChips({
  compact = false,
  category = "all",
}: TagChipsProps) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const activeKey = sp.get("tags") || "";

  // 🔥 카테고리별 태그 선택
  const tagList =
    category === "stay"
      ? STAY_TAGS
      : category === "food"
      ? FOOD_TAGS
      : TAGS;

  const toggle = (key: string) => {
    const params = new URLSearchParams(sp);

    if (activeKey === key) {
      params.delete("tags");
    } else {
      params.set("tags", key);
    }

    const search = params.toString();
    navigate(`/list${search ? `?${search}` : ""}`);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-4"}`}>
      {tagList.map(({ key, icon }) => {
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
