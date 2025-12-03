// src/pages/MyPage.tsx
import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import jejuBg from "../assets/images/제주도 배경.jpg";

type UserProfile = {
  nickname: string;
  photoURL?: string;
  phone?: string;
  lastTravelAt?: Timestamp | null;
};

type Tab = "manage" | "settings";

export default function MyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("manage");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("loading");

  // 프로필 수정 모달 상태
  const [editing, setEditing] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editPhotoURL, setEditPhotoURL] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // 1) Firestore에서 내 프로필 가져오기
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      setProfileStatus("loading");

      try {
        const refDoc = doc(db, "users", user.uid);
        const snap = await getDoc(refDoc);

        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            nickname: user.displayName || "제주 여행자",
            photoURL: user.photoURL || "",
            phone: "",
            lastTravelAt: null,
          };
          await setDoc(refDoc, newProfile);
          setProfile(newProfile);
        }

        setProfileStatus("done");
      } catch (e) {
        console.error("프로필 로딩 실패:", e);
        setProfileStatus("error");
      }
    };

    loadProfile();
  }, [user]);

  // 2) 훅 호출 뒤에 로그인 여부 체크
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  const openEdit = () => {
    // 프로필이 아직 없으면 user 정보를 기본값으로 사용
    const baseNickname =
      profile?.nickname || user.displayName || "제주 여행자";
    const basePhoto = profile?.photoURL || user.photoURL || "";
    const basePhone = profile?.phone || "";

    setEditNickname(baseNickname);
    setEditPhotoURL(basePhoto);
    setEditPhone(basePhone);
    setEditing(true);
  };

  // 🔹 프로필 사진 파일 업로드
  const onSelectFile = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileRef = ref(
        storage,
        `profileImages/${user.uid}/${Date.now()}_${file.name}`
      );

      // Storage에 업로드
      await uploadBytes(fileRef, file);

      // 다운로드 URL 가져오기
      const url = await getDownloadURL(fileRef);

      // 입력창 + 화면에 바로 반영
      setEditPhotoURL(url);
      setProfile((prev) =>
        prev ? { ...prev, photoURL: url } : prev
      );
    } catch (err) {
      console.error("이미지 업로드 실패:", err);
      alert("이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    const refDoc = doc(db, "users", user.uid);

    const current: UserProfile =
      profile || {
        nickname: editNickname || user.displayName || "제주 여행자",
        photoURL: editPhotoURL || user.photoURL || "",
        phone: editPhone || "",
        lastTravelAt: null,
      };

    const next: UserProfile = {
      ...current,
      nickname: editNickname,
      photoURL: editPhotoURL || "",
      phone: editPhone || "",
    };

    // Firebase Auth 프로필 업데이트
    await updateProfile(user, {
      displayName: editNickname,
      photoURL: editPhotoURL || undefined,
    });

    // Firestore 프로필 업데이트 (문서가 없으면 생성, 있으면 병합)
    await setDoc(refDoc, next, { merge: true });

    setProfile(next);
    setEditing(false);
  };

  const lastTravelText =
    profile?.lastTravelAt
      ? profile.lastTravelAt.toDate().toLocaleDateString("ko-KR")
      : "여행 기록 없음";

  const name = profile?.nickname || user.displayName || "제주 여행자";
  const email = user.email || "example@example.com";
  const phone = profile?.phone || "전화번호를 입력해주세요";

  return (
    <div
      className="min-h-svh w-full bg-cover bg-center px-4 sm:px-6 lg:px-12 py-10"
      style={{ backgroundImage: `url(${jejuBg})` }}
    >
      <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-[minmax(260px,320px),1fr]">
        {/* 왼쪽 프로필 카드 */}
        <section className="rounded-3xl bg-white/95 shadow-md p-6 flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3">
            {/* 프로필 이미지 */}
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt="프로필"
                className="h-24 w-24 rounded-full object-cover border"
              />
            ) : user.photoURL ? (
              <img
                src={user.photoURL}
                alt="프로필"
                className="h-24 w-24 rounded-full object-cover border"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-200 grid place-items-center text-3xl">
                {name[0]}
              </div>
            )}
            <div className="text-center">
              <div className="font-semibold text-lg">{name}</div>
              <div className="text-xs text-gray-500 break-all">{email}</div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-700 mt-2">
            <div>📞 {phone}</div>
            <div>📅 마지막 여행일: {lastTravelText}</div>
            <div>📍 자주가는 지역: 제주도</div>
          </div>

          {profileStatus === "loading" && (
            <div className="text-xs text-gray-400">프로필 불러오는 중…</div>
          )}

          <button
            className="mt-3 w-full rounded-xl border py-2 text-sm hover:bg-gray-50"
            onClick={openEdit}
          >
            프로필 수정
          </button>

          <button
            onClick={onLogout}
            className="mt-auto w-full rounded-xl border border-red-200 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            로그아웃
          </button>
        </section>

        {/* 오른쪽 메인 카드 */}
        <section className="rounded-3xl bg-white/95 shadow-md p-6 flex flex-col gap-4">
          {/* 탭 */}
          <div className="flex gap-2 border-b pb-2 text-sm">
            <button
              className={`px-3 py-1 rounded-full ${
                tab === "manage"
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setTab("manage")}
            >
              내 여행 관리
            </button>
            <button
              className={`px-3 py-1 rounded-full ${
                tab === "settings"
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setTab("settings")}
            >
              설정
            </button>
          </div>

          {/* 오른쪽 내용은 프로필 로딩 여부와 상관없이 그대로 표시 */}
          {tab === "manage" ? <MyTripsSection /> : <SettingsSection />}
        </section>
      </div>

      {/* 프로필 수정 모달 */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 space-y-4">
            <h2 className="font-semibold text-lg">프로필 수정</h2>

            <div className="space-y-3 text-sm">
              {/* 닉네임 */}
              <label className="block">
                <span className="text-gray-700">닉네임</span>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                />
              </label>

              {/* 프로필 사진 URL + 파일 업로드 */}
              <label className="block">
                <span className="text-gray-700">프로필 사진 URL</span>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={editPhotoURL}
                  onChange={(e) => setEditPhotoURL(e.target.value)}
                  placeholder="이미지 주소를 입력하거나 아래에서 파일 선택"
                />
                <div className="mt-2 flex items-center gap-2">
                  <label className="inline-flex items-center px-3 py-1.5 border rounded-xl text-xs cursor-pointer hover:bg-gray-50">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onSelectFile}
                    />
                    파일 선택
                  </label>
                  {editPhotoURL && (
                    <span className="text-[11px] text-gray-400">
                      선택된 이미지는 위 URL에 자동 반영돼요
                    </span>
                  )}
                </div>
              </label>

              {/* 전화번호 */}
              <label className="block">
                <span className="text-gray-700">전화번호</span>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="010-0000-0000"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 text-sm">
              <button
                className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                onClick={() => setEditing(false)}
              >
                취소
              </button>
              <button
                className="px-3 py-1.5 rounded-xl bg-black text-white hover:opacity-90"
                onClick={saveProfile}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- 아래 부분은 기존 그대로 사용 ---- */

function MyTripsSection() {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">저장된 여행</h2>

      <article className="rounded-2xl border bg-gray-50 p-4 flex gap-4">
        <div className="h-20 w-28 rounded-xl bg-gray-200" />
        <div className="flex-1">
          <div className="font-semibold">제주 자연 일일투어</div>
          <div className="mt-1 text-xs text-gray-500">
            2025-02-20 · 10:00 출발 · 1일 코스
          </div>
          <div className="mt-2 text-xs text-gray-400">
            총 5곳 · 이동거리 120km
          </div>
        </div>
        <button className="self-center rounded-xl border px-3 py-1 text-xs hover:bg-white">
          일정 보기
        </button>
      </article>

      <article className="rounded-2xl border bg-gray-50 p-4 flex gap-4">
        <div className="h-20 w-28 rounded-xl bg-gray-200" />
        <div className="flex-1">
          <div className="font-semibold">제주 힐링 여행</div>
          <div className="mt-1 text-xs text-gray-500">
            2025-03-12 · 3박 4일
          </div>
          <div className="mt-2 text-xs text-gray-400">
            총 8곳 · 이동거리 300km
          </div>
        </div>
        <button className="self-center rounded-xl border px-3 py-1 text-xs hover:bg-white">
          일정 보기
        </button>
      </article>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg">알림 설정</h2>

      <div className="space-y-3 text-sm">
        <ToggleRow label="여행 알림" description="여행 일정 전날 알림을 받아요." />
        <ToggleRow label="푸시 알림" description="여행 관련 소식을 받아요." />
        <ToggleRow label="프로모션 알림" description="할인 및 이벤트 정보를 받아요." />
      </div>

      <div className="border-t pt-4 space-y-4">
        <h3 className="font-semibold text-sm">언어 및 지역</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="rounded-xl border px-3 py-2 text-sm">
            <option>한국어</option>
            <option>English</option>
          </select>
          <select className="rounded-xl border px-3 py-2 text-sm">
            <option>서울 (GMT+9)</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="font-semibold text-sm">계정 관리</h3>
        <button className="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm text-red-600 hover:bg-red-100">
          계정 삭제
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  const [on, setOn] = useState(true);
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          on ? "bg-black" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            on ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
