"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";

type Message = {
  id: string;
  role: "user" | "ai";
  response: string;
  createdAt: string;
};

interface ChatProps {
  conversationId?: string | null;
}

export function Chat({ conversationId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const defaultMessages: Message[] = [
    {
      id: crypto.randomUUID(),
      role: "ai",
      response: "Hello! How can I help you today?",
      createdAt: new Date().toISOString(),
    },
  ];

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages
  useEffect(() => {
    if (!conversationId) {
      setMessages(defaultMessages);
    } else {
      fetchMessages();
    }
  }, [conversationId]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations/${conversationId}`,
        { withCredentials: true }
      );

      if (res.data.success) {
        setMessages(res.data.data.messages);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  // Send message (SSE ready)
  const sendMessage = async () => {
    if (!input) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      response: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // SSE example
    try {
      const sse = new EventSource(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat/stream?conversationId=${
          conversationId || ""
        }`,
        { withCredentials: true }
      );

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "ai",
        response: "",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      sse.onmessage = (event) => {
        if (event.data === "[DONE]") {
          sse.close();
          setLoading(false);
          return;
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id ? { ...m, response: m.response + event.data } : m
          )
        );
      };

      sse.onerror = () => {
        sse.close();
        setLoading(false);
      };
    } catch (err) {
      console.error("SSE Error", err);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#181316]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-xl break-words ${
                msg.role === "user"
                  ? "bg-[#A2014D] text-[#FBD0E8] rounded-br-none"
                  : "bg-[#21181C] text-[#A2014D] rounded-bl-none border border-[#312028]"
              }`}
            >
              {msg.response}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#312028] p-4 flex gap-3">
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
          className="flex-1 p-3 rounded-xl bg-[#21181C] text-[#A2014D] border border-[#312028] outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-[#A2014D] text-[#FBD0E8] px-4 py-2 rounded-xl font-medium disabled:opacity-70"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
