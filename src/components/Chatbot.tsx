// src/components/Chatbot.tsx
import { useState } from "react";
import type { KeyboardEvent } from "react";  // ✅ 타입만 import

interface ChatMessage {
  id: number;
  role: "user" | "bot";
  text: string;
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "bot",
      text: "안녕하세요! 어떤 제주 여행을 하고 싶으세요? (예: 2박3일 커플, 바다 위주)",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "bot",
        text: data.reply ?? "서버에서 응답을 받지 못했어요 😢",
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
        const errorMsg: ChatMessage = {
          id: Date.now() + 2,
          role: "bot",
          text: "오류가 발생했어요. 잠시 후 다시 시도해 주세요 😢",
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
   
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* 챗봇 버튼 */}
      <button
        onClick={toggleOpen}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "999px",
          border: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          backgroundColor: "#ff7f50",
          color: "white",
          fontSize: "24px",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        💬
      </button>

      {/* 대화창 */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "96px",
            right: "24px",
            width: "320px",
            height: "420px",
            backgroundColor: "white",
            borderRadius: "16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 1000,
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#ff7f50",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontWeight: 600 }}>제주 여행 챗봇</span>
            <button
              onClick={toggleOpen}
              style={{
                border: "none",
                background: "transparent",
                color: "white",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {/* 메시지 영역 */}
          <div
            style={{
              flex: 1,
              padding: "8px 12px",
              overflowY: "auto",
              fontSize: "14px",
              backgroundColor: "#f7f7f7",
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "8px 10px",
                    borderRadius: "12px",
                    whiteSpace: "pre-wrap",
                    backgroundColor:
                      m.role === "user" ? "#ffecd9" : "white",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ fontSize: "12px", color: "#888" }}>
                챗봇이 코스를 생각 중이에요...
              </div>
            )}
          </div>

          {/* 입력창 */}
          <div
            style={{
              borderTop: "1px solid #eee",
              padding: "8px",
              display: "flex",
              gap: "6px",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="원하는 여행을 입력해 주세요"
              style={{
                flex: 1,
                borderRadius: "999px",
                border: "1px solid #ddd",
                padding: "6px 10px",
                fontSize: "13px",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                borderRadius: "999px",
                border: "none",
                padding: "6px 12px",
                fontSize: "13px",
                backgroundColor: "#ff7f50",
                color: "white",
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              전송
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
