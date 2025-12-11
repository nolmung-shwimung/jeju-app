// src/api/reviews.ts
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
    type DocumentData,
    Timestamp,
    doc,
    updateDoc,
    deleteDoc,
  } from "firebase/firestore";
  import { db } from "../firebase";
  
  export interface Review {
    id: string;
    userId: string;
    userName: string;
    userPhotoUrl?: string | null;
    text: string;
    rating: "up" | "down" | "none";
    createdAt: Date;
  }
  
  // 특정 spot의 리뷰 전체 가져오기
  export const fetchReviews = async (spotId: string): Promise<Review[]> => {
    const ref = collection(db, "spots", spotId, "reviews");
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
  
    const reviews: Review[] = snap.docs.map((d) => {
      const data = d.data() as DocumentData;
  
      const rawCreatedAt = data.createdAt;
      const createdAt =
        rawCreatedAt instanceof Timestamp
          ? rawCreatedAt.toDate()
          : new Date();
  
      const review: Review = {
        id: d.id,
        userId: (data.userId as string) ?? "",
        userName: (data.userName as string) ?? "익명",
        userPhotoUrl:
          (data.userPhotoUrl as string | null | undefined) ?? null,
        text: (data.text as string) ?? "",
        rating: (data.rating as "up" | "down" | "none" | undefined) ?? "none",
        createdAt,
      };
  
      return review;
    });
  
    return reviews;
  };
  
  // 리뷰 작성
  export const addReview = async (
    spotId: string,
    review: Omit<Review, "id" | "createdAt">
  ) => {
    const ref = collection(db, "spots", spotId, "reviews");
    await addDoc(ref, {
      ...review,
      createdAt: serverTimestamp(),
    });
  };
  
  // 리뷰 내용 수정 (텍스트만)
  export const updateReviewText = async (
    spotId: string,
    reviewId: string,
    newText: string
  ) => {
    const ref = doc(db, "spots", spotId, "reviews", reviewId);
    await updateDoc(ref, {
      text: newText,
    });
  };
  
  // 리뷰 삭제
  export const deleteReviewById = async (spotId: string, reviewId: string) => {
    const ref = doc(db, "spots", spotId, "reviews", reviewId);
    await deleteDoc(ref);
  };
  