export default function Login() {
  return (
    <div className="container mx-auto max-w-screen-2xl px-4">
      {/* 헤더/푸터 높이를 감안해 70vh 정도로 중앙 정렬 */}
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm border rounded-2xl p-6 md:p-8 bg-white shadow-sm">
          <h1 className="text-xl font-bold text-center">로그인</h1>

          <button className="w-full mt-6 border rounded-lg py-2.5 flex items-center justify-center gap-2 hover:bg-gray-50">
            <span className="text-lg">G</span>
            <span>구글 계정으로 로그인</span>
          </button>

          <div className="my-4 text-center text-xs text-gray-400">또는</div>

          <button className="w-full border rounded-lg py-2.5 hover:bg-gray-50">
            구글 계정으로 회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
