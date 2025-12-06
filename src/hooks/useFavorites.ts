// src/hooks/useFavorites.ts
import { useEffect, useState } from "react";

export interface FavoriteItem {
  id: string;                   // spot.id
  name: string;
  category: string;             // "attraction" | "stay" | "food"
  thumbnailUrl: string | null;
}

const STORAGE_KEY = "jeju-favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // 처음 마운트될 때 localStorage에서 읽어오기
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as FavoriteItem[];
      setFavorites(parsed);
    } catch (e) {
      console.error("favorite 로드 실패:", e);
    }
  }, []);

  const save = (next: FavoriteItem[]) => {
    setFavorites(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("favorite 저장 실패:", e);
    }
  };

  const isFavorite = (id: string | null | undefined) => {
    if (!id) return false;
    const key = String(id);
    return favorites.some((f) => f.id === key);
  };

  const toggleFavorite = (item: FavoriteItem) => {
    const key = String(item.id);
    const exists = favorites.some((f) => f.id === key);

    const next = exists
      ? favorites.filter((f) => f.id !== key)
      : [...favorites, { ...item, id: key }];

    save(next);
  };

  return { favorites, isFavorite, toggleFavorite };
}
