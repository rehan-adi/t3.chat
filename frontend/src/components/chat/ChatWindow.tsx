import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export function ChatWindow({ messages, isLoading }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 bg-[#231C26] flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">
            How can I help you, Rehan?
          </h2>

          <div className="bg-[#1B151E] rounded-2xl overflow-hidden border border-white/10">
            <button className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/5 transition border-b border-white/10">
              <span className="text-lg">✍️</span>
              <div>
                <p className="font-medium text-foreground">Create</p>
                <p className="text-sm text-muted-foreground">
                  Write posts, emails, or ideas
                </p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/5 transition border-b border-white/10">
              <span className="text-lg">🔍</span>
              <div>
                <p className="font-medium text-foreground">Explore</p>
                <p className="text-sm text-muted-foreground">
                  Discover topics and explanations
                </p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/5 transition border-b border-white/10">
              <span className="text-lg">💻</span>
              <div>
                <p className="font-medium text-foreground">Code</p>
                <p className="text-sm text-muted-foreground">
                  Get help with programming
                </p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/5 transition">
              <span className="text-lg">📘</span>
              <div>
                <p className="font-medium text-foreground">Learn</p>
                <p className="text-sm text-muted-foreground">
                  Learn something new step by step
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 bg-[#231C26] overflow-y-auto scrollbar-thin"
    >
      <div className="max-w-3xl mx-auto py-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            isStreaming={message.isStreaming}
          />
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2 px-4 py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
